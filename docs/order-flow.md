# The CibusHub flow, end to end

From signing up to a delivered, paid order: **how** each step works, **why** it was built that way, **which** files, addresses and tables are involved, **when** it happens, and **who** acts.

The details live in other docs; this one ties them together. When the two disagree, the code wins. Then fix the doc.

| Deeper detail | Doc |
|---|---|
| Every allowed order status change | [order-state-machine.md](order-state-machine.md) |
| Prices, fees, who earns what | [pricing.md](pricing.md) |
| Timers and background jobs | [background-jobs.md](background-jobs.md) |
| Live updates (Socket.IO events) | [realtime-events.md](realtime-events.md) |
| Rider search, delivery codes, returns | [adr/003-delivery-assignment.md](adr/003-delivery-assignment.md) |
| Who may call which address | [permission-matrix.md](permission-matrix.md) |
| Deleting an account | [account-deletion.md](account-deletion.md) |

---

## The cast

| Who | What they do |
|---|---|
| **Customer** | Browses, orders, pays, tracks, reviews |
| **Restaurant owner** | Lists a restaurant and menu, accepts and cooks orders |
| **Rider** | Picks up and delivers |
| **Admin / super admin** | Approves restaurants and riders, watches orders, steps in when something goes wrong |
| **System** | The API (`server/src/index.js`) answers requests. The **worker** (`server/src/worker.js`) runs timers and background jobs |
| **Outside services** | Paystack (payments), Nalo (SMS), Resend (email), Cloudinary (photos and documents), OpenStreetMap (maps), Google, Apple and Facebook (sign-in) |

How one request travels inside the server: `routes → middlewares (login, role, limits) → validators → controllers → services → repositories → models → MySQL`. The **services** hold the rules. Look there first.

---

## 1. Signing up

**Who:** anyone. **When:** first visit, from Sign up.

**How:**
1. The form sends name, phone, email, password and role (customer, restaurant owner or rider) plus the Terms tick to `POST /api/v1/auth/register`.
2. The account starts as:
   - **customer:** `PENDING_VERIFICATION`
   - **owner or rider:** `PENDING_APPROVAL`
3. A 6-digit code goes by **SMS** (Nalo). `POST /auth/verify-phone` checks it. A customer becomes `ACTIVE`; an owner or rider stays waiting for approval (step 2 or 3).
4. After logging in, they confirm their **email** with a second code (`/auth/email/send-code`, `/auth/email/verify`).
5. A **welcome** SMS and email go out once, on the first phone verification (`services/notifications/welcome.service.js`).

**With Google, Apple or Facebook:** `POST /auth/social`. The server checks the token with the provider (`utils/auth/socialTokens.js`), then:
- links the provider to an existing account with the same email, or
- creates a new account with **no phone yet**.

They're sent to **Add your phone** (`/auth/phone`) and verify it by SMS like everyone else.

**Why:**
- **Phone first:** riders and restaurants need to reach the customer, and SMS works on every phone in Ghana.
- **Owners and riders wait for approval:** a person must check documents before anyone handles food or money.

**Which:**
- Code: `services/auth/registration/*`, `services/auth/social/socialSignIn.service.js`
- Tables: `users`, `oauth_accounts`, `refresh_tokens`
- Pages: `client/src/pages/auth/*`

**Logging in:** `POST /auth/login` sets two **HttpOnly cookies**: a 15-minute access cookie and a 7-day refresh cookie. `client/src/lib/api.js` renews the short one quietly. JavaScript can never read either cookie, which protects them from stolen-script attacks.

---

## 2. A restaurant goes live

**Who:** owner, then admin. **When:** after the owner verifies their phone.

**How:**
1. **Owner** → My restaurants → New: name, address pin, hours, cuisine (`POST /owner/restaurants`). Status: `PENDING_APPROVAL`.
2. **Owner** uploads documents (business registration, FDA certificate, Ghana Card) and photos. Documents are stored **privately** on Cloudinary.
3. **Admin** → Restaurants: opens the documents and **approves** or **rejects** with a reason (`services/restaurant/reviewRestaurant.service.js`). Approving also makes the owner's account `ACTIVE`, and the owner gets an SMS and email.
4. **Owner** builds the menu: categories, dishes, prices in pesewas, option groups like "Size" or "Extra meat", daily stock and photos (`/owner/restaurants/:id/menu`).
5. The restaurant appears to customers while it is `APPROVED`, **open** by its hours (Africa/Accra time) and not paused.

**Why:**
- **Approval first:** customers trust that every kitchen was checked.
- **Daily stock:** the kitchen can say "only 20 portions of fufu today", and the app stops selling at 0.

**Which:**
- Code: `routes/owner/restaurant.routes.js`, `routes/owner/menu.routes.js`, `services/restaurant/*`, `services/menu/*`
- Tables: `restaurants`, `opening_hours`, `restaurant_documents`, `menu_categories`, `menu_items`, `option_groups`, `options`
- Pages: `client/src/pages/owner/*`

---

## 3. A rider goes online

**Who:** rider, then admin. **When:** after the rider verifies their phone.

**How:**
1. **Rider** fills in the application: vehicle, plate, Ghana Card number, and uploads the card and licence (`routes/rider/application.routes.js`).
2. **Admin** checks it and approves (`services/rider/reviewRider.service.js`). The rider's account becomes `ACTIVE`.
3. **Rider** taps **Go online** (`POST /rider/status/online`). The phone then sends its position about every 5 seconds over Socket.IO (`rider:location`).
4. If the phone goes quiet for 5 minutes, the worker takes the rider offline (`sweepStaleRiders`).

**Why:** riders are only offered deliveries while they're online and the app knows where they are. A rider who closed the app without going offline must not be offered food.

**Which:**
- Code: `services/rider/*`
- Tables: `rider_profiles`, `rider_documents`, `rider_locations`
- Redis holds the live position (`services/rider/riderLocationStore.js`)

---

## 4. Browsing and the cart

**Who:** customer (or a guest). **When:** any time.

**How:**
1. The home page and Restaurants list call `GET /restaurants`, which shows which restaurants are open and whether they deliver to the customer's address.
2. A restaurant's page shows its menu, with sold-out dishes greyed out.
3. The **cart** lives in the browser (`client/src/store/cartStore.js`), one restaurant at a time. `POST /cart/check` re-checks prices and stock before checkout.

**Why the cart lives in the browser:** a guest can fill a cart before signing up. The server re-checks everything anyway, so the browser is never trusted on prices.

---

## 5. Checkout and placing the order

**Who:** customer (logged in, phone verified). **When:** they tap Checkout, then **Place order**.

**How:**
1. **Address:** the customer picks a saved address or drops a pin on the map (`/customer/addresses`).
2. **Quote:** `POST /customer/checkout/quote` works out the subtotal, delivery fee (distance based), service fee and total, and checks:
   - the restaurant is open,
   - the address is within delivery range,
   - every dish is in stock.

   The page shows this total.
3. **Place order:** `POST /customer/orders`, with an **Idempotency-Key** header (a random ID made once per tap) and the total the page showed (`seenTotalPesewas`). In **one database transaction**, the server:
   - recalculates the price with the same `buildQuote` function; if the total changed (e.g. a fee was updated), it answers `TOTAL_CHANGED` and the page shows the new total,
   - takes the stock,
   - creates the order as **`PENDING_PAYMENT`**, with its items and a `pricing_snapshot`,
   - freezes the money split (commission, restaurant earnings, rider earnings),
   - writes the first `order_status_history` row.
4. A **30-minute timer** starts (`expireUnpaidOrder`). If the order still isn't paid by then, it's cancelled and the stock goes back.

**Why:**
- **Idempotency-Key:** a double tap, or a retry on a bad network, returns the **same** order instead of making two.
- **The server recalculates:** "shown = charged", and nobody can edit prices in the browser.
- **The frozen split:** changing the commission next month never changes an old order.
- **One transaction:** either everything is saved, or nothing. You never get an order without its items, or stock taken without an order.

**Which:**
- Code: `services/order/placeOrder.service.js`, `services/checkout/*`, `utils/money.js`
- Tables: `orders`, `order_items`, `order_status_history`
- Limits: at most 10 orders per 10 minutes per customer (`middlewares/rateLimit/checkoutLimiters.js`)

---

## 6. Paying (Paystack)

**Who:** customer, Paystack, then the system. **When:** right after placing the order.

**How:**
1. `POST /customer/orders/:id/payments` asks Paystack to start a payment for the **order's stored total**, never an amount from the browser. A `payments` row is saved as `PENDING`, with a unique reference like `CH-261009-482193-9F3A1C`.
2. The customer pays on **Paystack's page** (card or Mobile Money). CibusHub never sees card numbers or MoMo PINs.
3. Paystack sends them back to `/orders/:id/payment`. That page does **not** trust the redirect. It asks our server every few seconds (`GET …/payment-status`), and the server asks Paystack itself.
4. Paystack also calls our **webhook**, `POST /api/v1/webhooks/paystack`, with `charge.success`. The server:
   - checks the **signature**,
   - checks the **amount**,
   - moves the order to **`PAID`** (only once, even if Paystack calls twice).
5. Safety net: every 10 minutes the worker checks any payment still pending (`reconcilePayments`), in case a webhook got lost.

**On `PAID`:**
- the restaurant's board rings (Socket.IO `order:updated`, SMS and email),
- the customer gets a receipt,
- a **5-minute timer** starts for the restaurant to answer (`rejectUnansweredOrder`).

**Why:**
- **Webhook and status check together:** the webhook is fast; asking Paystack directly covers a webhook that never arrives.
- **Signature and amount checks:** nobody can fake a "paid" message.

**Which:**
- Code: `services/payment/startPayment.service.js`, `services/payment/paystackWebhook.service.js`, `services/payment/paymentStatus.service.js`, `services/payment/paystack.client.js`
- Table: `payments`

---

## 7. The restaurant answers and cooks

**Who:** owner (or their staff on the owner account). **When:** within 5 minutes of `PAID`.

**How:**

| Tap | Address | Order becomes |
|---|---|---|
| Accept (with a prep time) | `POST /owner/orders/:id/accept` | `ACCEPTED`, and **the rider search starts now** |
| Reject (with a reason) | `…/reject` | `REJECTED`, with a **full refund** |
| Start preparing | `…/preparing` | `PREPARING` |
| Ready for pickup | `…/ready` | `READY_FOR_PICKUP` |

No answer in 5 minutes means the worker rejects the order (`RESTAURANT_TIMEOUT`) and refunds in full.

**Why:**
- **The 5-minute rule:** a customer who has paid shouldn't wait on a kitchen that's closed or busy.
- **Searching at Accept:** the rider travels while the food cooks, so nobody waits at the counter.

**Which:**
- Code: `services/order/changeOrderStatus.service.js`, `services/order/ownerOrders.service.js`, `utils/order/orderStateMachine.js` (every allowed move)
- Page: `client/src/pages/owner/OwnerDashboardPage.jsx` (the order board, updated live)

---

## 8. Finding a rider

**Who:** system, then a rider. **When:** from `ACCEPTED`.

**How:**
1. A `deliveries` row starts as `SEARCHING`.
2. The worker (`offerDelivery`) offers the order to the **nearest free, online rider** within 5 km, widened to 10 km later. Each offer lasts **60 seconds**, on the rider's phone with a sound (`delivery:offer`).
3. **Accept:** the rider is assigned (`POST /rider/offers/:id/accept`). **Decline or time out:** the next rider is asked. A rider is never asked twice for the same order.
4. The order shows **`RIDER_ASSIGNED`** once the food is ready **and** a rider has accepted, whichever comes second.
5. No rider after 10 minutes: admins are alerted and can assign one by hand. The customer is told about the delay.

**Why:**
- **Locks:** two riders tapping Accept at the same moment can't both get the order. Database row locks make the second one get "already taken".

**Which:**
- Code: `services/delivery/*`
- Tables: `deliveries`, `delivery_offers`
- Doc: [ADR 003](adr/003-delivery-assignment.md)

---

## 9. Pickup and delivery

**Who:** rider, customer. **When:** after `RIDER_ASSIGNED`.

**How:**
1. **Rider** taps **Picked up** at the restaurant (`/rider/deliveries/current/pickup`). If they're more than 200 m away, they're warned and admins are told. Order: **`PICKED_UP`**.
2. **Customer** watches the rider move on the map (Socket.IO `rider:location`, with an estimated arrival time) and sees a **4-digit delivery code**.
3. **Rider** types the customer's code (`…/complete`). Order: **`DELIVERED`**.
4. **Problems at the door:**
   - **5 wrong codes** lock the code. The customer can then tap "I've received my food", or an admin can unlock it.
   - **Customer unreachable:** the rider reports a problem and a 10-minute wait starts. If nobody acts, the order is cancelled without a refund and the food goes back to the restaurant. The rider earns 1.5x for the trip.

**Why:** the code proves the food reached the **right person**, protecting the customer, the rider and the restaurant.

**Which:**
- Code: `routes/rider/delivery.routes.js`, `services/delivery/*`
- Pages: `client/src/pages/rider/RiderDeliveryPage.jsx`, `client/src/pages/customer/OrderDetailPage.jsx`

---

## 10. After delivery

| What | Who | How |
|---|---|---|
| **Review** | customer | 1–5 stars for the food (and the rider), within 7 days of delivery (`/customer/orders/:id/review`). The owner can reply; an admin can hide abuse |
| **Receipt** | customer | On screen and as a PDF (`…/receipt`, `services/order/receiptPdf.service.js`) |
| **Earnings** | owner, rider | Counted only on `DELIVERED` orders, from the frozen split ([pricing.md](pricing.md)). Riders see theirs under Earnings |
| **Reports** | owner, admin | Sales, times, top dishes (`/owner/analytics`, `/admin/analytics`). Admins get a daily summary email at 23:59 |

---

## 11. When things go wrong: cancellations and refunds

| Situation | Who | Result |
|---|---|---|
| Not paid in 30 minutes | system | `CANCELLED`, stock returned, nothing to refund |
| Customer cancels before the restaurant accepts | customer | `CANCELLED`, **full refund** |
| Restaurant rejects, or doesn't answer in 5 minutes | owner / system | `REJECTED`, **full refund** |
| Admin cancels at any stage | admin | `CANCELLED`, refund decided by the admin, with a reason (audited) |
| Nobody at the door after the 10-minute wait | system | `CANCELLED`, **no refund**, food returned |

**How refunds work:** a `refunds` row starts as `PENDING`. The worker sends it to Paystack (`processRefund`) and checks every 5 minutes until it's done (`processPendingRefunds`). The customer is told when it's sent. Admins can retry a failed one from **Payments**.

**Which:** `services/refund/*`, the `refunds` table, [background-jobs.md](background-jobs.md).

---

## 12. Messages along the way

Every important step tells the right people:
- **in the app:** the bell icon, plus live Socket.IO updates,
- by **SMS** (Nalo),
- by **email** (Resend).

People choose some of these in **Notification settings**. Sending runs in the worker (`sendNotification`, 3 tries), so a slow SMS provider never slows down ordering. Every message is logged, with phone numbers and emails masked, in `notification_logs`.

---

## The whole order in one line

```
Sign up → (owner/rider: approved) → Browse → Cart → Quote → Place order (PENDING_PAYMENT, 30 min)
→ Pay on Paystack → Webhook/check → PAID (restaurant has 5 min) → ACCEPTED (rider search starts)
→ PREPARING → READY_FOR_PICKUP → RIDER_ASSIGNED → PICKED_UP (code shown) → DELIVERED → Review
```
