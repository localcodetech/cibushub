# CibusHub — Acceptance Criteria

**Project:** CibusHub — Food Ordering & Delivery System
**Scope:** Restaurants, menus, cart, orders, payments, riders, live tracking, notifications, administration
**Required stack:** React.js · Express.js · Sequelize · MySQL
**Supporting services:** Redis, BullMQ, Socket.IO, Paystack, Hubtel/Arkesel, Resend/SendGrid, Google Maps Platform, Cloudinary
**Document version:** 1.0

---

## Table of Contents

1. [How to Read This Document](#1-how-to-read-this-document)
2. [Global Criteria (Apply Everywhere)](#2-global-criteria-apply-everywhere)
3. [Authentication & Account Management](#3-authentication--account-management)
4. [Authorization & Role-Based Access Control](#4-authorization--role-based-access-control)
5. [Customer Profile & Addresses](#5-customer-profile--addresses)
6. [Restaurant Discovery & Search](#6-restaurant-discovery--search)
7. [Restaurant Onboarding & Profile Management](#7-restaurant-onboarding--profile-management)
8. [Menu Management](#8-menu-management)
9. [Cart](#9-cart)
10. [Checkout & Order Creation](#10-checkout--order-creation)
11. [Payments](#11-payments)
12. [Order Lifecycle & State Machine](#12-order-lifecycle--state-machine)
13. [Restaurant Order Handling](#13-restaurant-order-handling)
14. [Rider Onboarding & Availability](#14-rider-onboarding--availability)
15. [Rider Assignment](#15-rider-assignment)
16. [Delivery Execution](#16-delivery-execution)
17. [Real-Time Tracking (Socket.IO)](#17-real-time-tracking-socketio)
18. [Maps, Geocoding & ETA](#18-maps-geocoding--eta)
19. [Notifications (Email, SMS, In-App)](#19-notifications-email-sms-in-app)
20. [Cancellations & Refunds](#20-cancellations--refunds)
21. [Reviews & Ratings](#21-reviews--ratings)
22. [Admin Panel](#22-admin-panel)
23. [Super Admin](#23-super-admin)
24. [Analytics & Reporting](#24-analytics--reporting)
25. [Image & File Management](#25-image--file-management)
26. [Background Jobs & Scheduling](#26-background-jobs--scheduling)
27. [Security](#27-security)
28. [Performance & Scalability](#28-performance--scalability)
29. [Frontend UX, Accessibility & Responsiveness](#29-frontend-ux-accessibility--responsiveness)
30. [API Design & Documentation](#30-api-design--documentation)
31. [Data Integrity & Database](#31-data-integrity--database)
32. [Testing](#32-testing)
33. [DevOps, Deployment & CI/CD](#33-devops-deployment--cicd)
34. [Monitoring, Logging & Reliability](#34-monitoring-logging--reliability)
35. [Project Deliverables & Definition of Done](#35-project-deliverables--definition-of-done)

---

## 1. How to Read This Document

Each criterion has a unique ID in the form `AC-<MODULE>-<NN>` so it can be referenced in tickets, pull requests, test names and the final report.

Behavioural criteria use **Given / When / Then**:

- **Given** — the starting state or preconditions
- **When** — the action performed
- **Then** — the observable, verifiable outcome

Non-behavioural requirements (security, performance, quality) are written as checklist items that must all be true.

**Priority tags**

| Tag | Meaning |
|---|---|
| `[MUST]` | Required for the system to be considered complete |
| `[SHOULD]` | Expected for a 5-star result; omit only with written justification |
| `[COULD]` | Enhancement; implement if time allows |

**Roles referenced:** `CUSTOMER`, `RESTAURANT_OWNER`, `RIDER`, `ADMIN`, `SUPER_ADMIN`, and `GUEST` (not logged in).

**Money convention:** All amounts are stored and transmitted as integers in **pesewas** (GHS 1.00 = 100). Displayed values are formatted as `GHS 45.50`.

**Time convention:** All timestamps are stored in UTC and displayed in `Africa/Accra` time.

---

## 2. Global Criteria (Apply Everywhere)

**AC-GLOBAL-01 — Consistent error format** `[MUST]`
- Given any API endpoint
- When a request fails for any reason
- Then the response has the correct HTTP status code and a JSON body of the shape `{ "success": false, "error": { "code": "STRING_CODE", "message": "Human readable message", "details": [...] } }`
- And no stack trace, SQL query or internal file path is ever included in production responses.

**AC-GLOBAL-02 — Consistent success format** `[MUST]`
- Given any API endpoint
- When a request succeeds
- Then the response body has the shape `{ "success": true, "data": ..., "meta": {...} }`, where `meta` carries pagination info for list endpoints.

**AC-GLOBAL-03 — Validation on every write** `[MUST]`
- Given any endpoint that accepts a body, query or route parameters
- When the input does not match its Zod schema
- Then the API returns `400` with code `VALIDATION_ERROR` and a `details` array listing each invalid field and the reason
- And no database write occurs.

**AC-GLOBAL-04 — Pagination on every list** `[MUST]`
- Given any endpoint that returns a list
- When called without pagination params
- Then it returns a default page size of 20 (maximum 100)
- And `meta` includes `page`, `pageSize`, `totalItems` and `totalPages`.

**AC-GLOBAL-05 — Unknown routes** `[MUST]`
- Given a request to a route that does not exist
- Then the API returns `404` with code `NOT_FOUND`
- And the React app shows a styled 404 page with a link back home.

**AC-GLOBAL-06 — Soft deletes** `[SHOULD]`
- Given a user, restaurant, menu item or rider is deleted
- Then the record is soft-deleted (Sequelize `paranoid: true`)
- And historical orders that reference it still display correctly.

**AC-GLOBAL-07 — Timestamps** `[MUST]`
- Every table has `createdAt` and `updatedAt`, and soft-deletable tables have `deletedAt`.

**AC-GLOBAL-08 — Currency display** `[MUST]`
- Given any price shown in the UI
- Then it is formatted as `GHS X.XX`, derived from integer pesewas
- And no floating-point arithmetic is used for money anywhere in the backend.

---

## 3. Authentication & Account Management

### 3.1 Registration

**AC-AUTH-01 — Customer registration** `[MUST]`
- Given a guest on the registration page
- When they submit full name, email, Ghanaian phone number and password
- Then a `CUSTOMER` account is created with status `PENDING_VERIFICATION`
- And the password is stored only as an Argon2 or bcrypt hash
- And a verification OTP is sent by SMS and/or a verification link by email
- And the API returns `201` without the password hash in the response.

**AC-AUTH-02 — Duplicate account prevention** `[MUST]`
- Given an email or phone number already registered
- When a guest tries to register with it
- Then the API returns `409` with code `ACCOUNT_EXISTS`
- And the message does not reveal which field (email or phone) caused the conflict beyond what is needed for the user to proceed.

**AC-AUTH-03 — Password policy** `[MUST]`
- Given a registration or password change
- When the password is shorter than 8 characters, or lacks at least one letter and one number
- Then validation fails on both client (Zod + React Hook Form) and server (Zod).

**AC-AUTH-04 — Phone number normalisation** `[MUST]`
- Given a phone number entered as `024 123 4567`, `0241234567` or `+233241234567`
- Then it is stored in E.164 format (`+233241234567`)
- And invalid Ghanaian numbers are rejected.

**AC-AUTH-05 — Restaurant owner and rider registration** `[MUST]`
- Given a guest chooses "Register as a restaurant" or "Register as a rider"
- When they submit the role-specific form
- Then the account is created with the correct role and status `PENDING_APPROVAL`
- And they cannot access operational features until an admin approves them.

**AC-AUTH-06 — Admin accounts are never self-registered** `[MUST]`
- Given the public registration endpoint
- When a request includes `role: "ADMIN"` or `role: "SUPER_ADMIN"`
- Then the role field is ignored or rejected, and the account can only be created as `CUSTOMER`, `RESTAURANT_OWNER` or `RIDER`.

### 3.2 OTP Verification

**AC-AUTH-07 — OTP generation and storage** `[MUST]`
- Given an OTP is requested
- Then a 6-digit numeric code is generated with a cryptographically secure generator
- And it is stored in Redis (hashed) with a TTL of 5 minutes
- And it is never stored in MySQL or written to logs.

**AC-AUTH-08 — OTP verification** `[MUST]`
- Given a valid, unexpired OTP
- When the user submits it
- Then the account status becomes `ACTIVE` (customers) and the OTP is deleted from Redis immediately (single use).

**AC-AUTH-09 — OTP attempt limit** `[MUST]`
- Given a user enters a wrong OTP 5 times
- Then the OTP is invalidated
- And further attempts return `429` until a new OTP is requested.

**AC-AUTH-10 — OTP resend throttling** `[MUST]`
- Given a user requests an OTP resend
- When they request again within 60 seconds
- Then the API returns `429` with the seconds remaining
- And no more than 5 OTPs can be sent to one phone number per hour.

### 3.3 Login & Sessions

**AC-AUTH-11 — Login with email or phone** `[MUST]`
- Given an active account
- When the user submits a correct email/phone and password
- Then a short-lived access JWT (15 min) and a refresh token (7 days) are issued
- And both are set as `HttpOnly`, `Secure`, `SameSite=Lax` (or `Strict`) cookies
- And no token is stored in `localStorage` or `sessionStorage`.

**AC-AUTH-12 — Generic login failure** `[MUST]`
- Given wrong credentials
- Then the API returns `401` with the message "Invalid credentials"
- And the response does not reveal whether the email/phone exists.

**AC-AUTH-13 — Brute-force protection** `[MUST]`
- Given 5 failed login attempts for one account or IP within 15 minutes
- Then further attempts are blocked with `429` for 15 minutes, enforced by `express-rate-limit` backed by Redis.

**AC-AUTH-14 — Token refresh** `[MUST]`
- Given an expired access token and a valid refresh token
- When the frontend calls the refresh endpoint
- Then a new access token is issued and the refresh token is rotated
- And TanStack Query retries the original request transparently without the user noticing.

**AC-AUTH-15 — Refresh token reuse detection** `[SHOULD]`
- Given a refresh token that has already been rotated
- When it is presented again
- Then all sessions for that user are revoked and the user must log in again.

**AC-AUTH-16 — Logout** `[MUST]`
- Given a logged-in user
- When they log out
- Then the refresh token is revoked server-side, cookies are cleared, the Zustand store is reset and the TanStack Query cache is cleared.

**AC-AUTH-17 — Suspended accounts** `[MUST]`
- Given an account with status `SUSPENDED`
- When it attempts to log in or use an existing token
- Then access is denied with `403` and code `ACCOUNT_SUSPENDED`.

### 3.4 Password Reset

**AC-AUTH-18 — Request reset** `[MUST]`
- Given a user on "Forgot password"
- When they submit an email or phone
- Then the API always returns the same generic success message whether or not the account exists
- And if it exists, a reset link (email) or OTP (SMS) valid for 15 minutes is sent.

**AC-AUTH-19 — Complete reset** `[MUST]`
- Given a valid reset token/OTP
- When the user sets a new password that meets the policy
- Then the password hash is updated, the token is invalidated and all existing sessions are revoked
- And a "Your password was changed" notification is sent.

**AC-AUTH-20 — Change password while logged in** `[MUST]`
- Given a logged-in user
- When they change their password
- Then the current password must be supplied and verified first.

---

## 4. Authorization & Role-Based Access Control

**AC-RBAC-01 — Route protection by role** `[MUST]`
- Given any protected endpoint
- When called by a user whose role is not permitted
- Then the API returns `403` with code `FORBIDDEN`.

**AC-RBAC-02 — Unauthenticated access** `[MUST]`
- Given any protected endpoint
- When called without a valid access token
- Then the API returns `401` with code `UNAUTHENTICATED`.

**AC-RBAC-03 — Middleware order** `[MUST]`
- Every protected route runs, in order: authentication → authorization (role) → validation → rate limiting → controller.

**AC-RBAC-04 — Ownership: restaurant owners** `[MUST]`
- Given restaurant owner A
- When A tries to read or modify restaurant B's profile, menu, orders or payouts, by changing an ID in the URL or body
- Then the API returns `403` (or `404` to avoid leaking existence)
- And this is covered by an automated Supertest test.

**AC-RBAC-05 — Ownership: customers** `[MUST]`
- Given customer A
- When A requests customer B's order, address, cart or payment record
- Then access is denied, and this is covered by an automated test.

**AC-RBAC-06 — Ownership: riders** `[MUST]`
- Given rider A
- When A tries to update the status or location of a delivery assigned to rider B
- Then access is denied.

**AC-RBAC-07 — Frontend route guards** `[MUST]`
- Given a user navigates directly to a URL for another role's dashboard (e.g. a customer visits `/admin`)
- Then React Router redirects them to their own dashboard or a 403 page
- And no admin data is fetched.

**AC-RBAC-08 — Role-appropriate navigation** `[MUST]`
- Given any logged-in user
- Then the navigation shows only the links and actions their role can perform.

**AC-RBAC-09 — Permission matrix documented** `[SHOULD]`
- A permission matrix (role × resource × action) is included in the project documentation and matches the implemented middleware.

---

## 5. Customer Profile & Addresses

**AC-CUST-01 — View and edit profile** `[MUST]`
- Given a logged-in customer
- When they update their name or profile photo
- Then the change is saved and reflected immediately in the UI.

**AC-CUST-02 — Changing phone or email requires re-verification** `[MUST]`
- Given a customer changes their phone number or email
- Then the new value is only saved after OTP/link verification of the new contact.

**AC-CUST-03 — Save delivery addresses** `[MUST]`
- Given a customer adding an address
- When they provide a label (Home, Work, Other), a map pin (latitude/longitude) and optional fields — Ghana Post GPS digital address, area/neighbourhood, landmark and delivery instructions
- Then the address is saved and can be selected at checkout.

**AC-CUST-04 — Pin required** `[MUST]`
- Given a customer saves an address
- When no map pin/coordinates are provided
- Then the address cannot be saved, because the rider depends on coordinates for navigation.

**AC-CUST-05 — Use current location** `[SHOULD]`
- Given a customer taps "Use my current location"
- When browser geolocation permission is granted
- Then the pin is placed at their location and reverse geocoding pre-fills the area name
- And if permission is denied, a helpful message explains how to place the pin manually.

**AC-CUST-06 — Ghana Post GPS format** `[SHOULD]`
- Given a digital address is entered
- Then it is validated against the format `XX-XXX-XXXX` (e.g. `GA-123-4567`).

**AC-CUST-07 — Default address** `[SHOULD]`
- Given a customer has multiple addresses
- Then exactly one can be marked default and it is pre-selected at checkout.

**AC-CUST-08 — Address limits** `[COULD]`
- A customer may store up to 10 addresses.

**AC-CUST-09 — Order history** `[MUST]`
- Given a customer
- When they open "My Orders"
- Then they see their orders, newest first, paginated, each with restaurant, date, total and current status, and can open any order to see its full details and timeline.

**AC-CUST-10 — Reorder** `[COULD]`
- Given a past delivered order
- When the customer taps "Reorder"
- Then the available items are added to the cart at current prices, and any unavailable items are listed as skipped.

**AC-CUST-11 — Account deletion** `[SHOULD]`
- Given a customer requests account deletion
- Then personal data is anonymised or soft-deleted, while order and payment records needed for accounting are retained without personal identifiers.

---

## 6. Restaurant Discovery & Search

**AC-DISC-01 — Browse restaurants** `[MUST]`
- Given any user (including guests)
- When they open the home page
- Then they see approved, active restaurants with cover image, name, cuisine tags, average rating, delivery fee estimate, estimated delivery time and open/closed status.

**AC-DISC-02 — Only approved restaurants are public** `[MUST]`
- Given a restaurant with status `PENDING_APPROVAL`, `REJECTED` or `SUSPENDED`
- Then it never appears in public listings or search results, and its direct URL returns 404 to the public.

**AC-DISC-03 — Location-aware listing** `[SHOULD]`
- Given the customer has set a delivery location
- Then restaurants are sorted by distance by default
- And restaurants outside their delivery radius are hidden or clearly marked "Doesn't deliver to your area".

**AC-DISC-04 — Open/closed status** `[MUST]`
- Given a restaurant's opening hours in `Africa/Accra` time
- Then its status shows "Open", "Closed" or "Opens at HH:MM" accurately
- And the owner's manual "Temporarily closed" toggle overrides opening hours.

**AC-DISC-05 — Search** `[MUST]`
- Given a user types in the search bar
- When they search by restaurant name, dish name or cuisine (e.g. "jollof", "waakye", "pizza")
- Then matching restaurants and dishes are returned using MySQL FULLTEXT indexes
- And results appear within 500 ms for a dataset of up to 10,000 menu items.

**AC-DISC-06 — Debounced search input** `[SHOULD]`
- Given a user is typing
- Then requests are debounced (about 300 ms) so a request is not sent per keystroke.

**AC-DISC-07 — Filters** `[SHOULD]`
- Given the restaurant list
- When the user filters by cuisine, rating (e.g. 4+), "open now", price level or delivery fee
- Then the list updates accordingly and filters are reflected in the URL query string, so results are shareable and survive refresh.

**AC-DISC-08 — Sorting** `[SHOULD]`
- Users can sort by distance, rating, delivery time and popularity.

**AC-DISC-09 — Empty results** `[MUST]`
- Given a search or filter with no matches
- Then a friendly empty state is shown with a suggestion (e.g. "Clear filters").

**AC-DISC-10 — Restaurant detail page** `[MUST]`
- Given a user opens a restaurant
- Then they see its profile, opening hours, address, rating and review count, and its menu grouped by category, with unavailable items visibly disabled.

---

## 7. Restaurant Onboarding & Profile Management

**AC-REST-01 — Submit restaurant for approval** `[MUST]`
- Given a registered `RESTAURANT_OWNER`
- When they submit business name, description, address with map pin, phone, cuisine tags, opening hours, logo, cover image and verification documents (e.g. business registration, FDA certificate)
- Then the restaurant is created with status `PENDING_APPROVAL` and admins are notified.

**AC-REST-02 — Approval outcome** `[MUST]`
- Given an admin approves or rejects a restaurant
- Then the status updates, and the owner is notified by email/SMS; rejection includes a reason.

**AC-REST-03 — Resubmission** `[SHOULD]`
- Given a rejected restaurant
- When the owner corrects the details and resubmits
- Then the status returns to `PENDING_APPROVAL`.

**AC-REST-04 — Edit profile** `[MUST]`
- Given an approved restaurant
- When the owner edits their profile
- Then changes save immediately, except sensitive fields (legal name, verification documents), which require admin re-review.

**AC-REST-05 — Opening hours** `[MUST]`
- The owner can set opening and closing times for each day of the week, mark days closed, and set hours that cross midnight (e.g. 18:00–02:00).

**AC-REST-06 — Temporarily closed toggle** `[MUST]`
- Given an owner switches "Accepting orders" off
- Then the restaurant immediately shows as closed and new orders are rejected by the API, while in-progress orders continue.

**AC-REST-07 — Delivery settings** `[SHOULD]`
- The owner (or admin, depending on business rules) can set minimum order amount, delivery radius (km) and average preparation time.

**AC-REST-08 — Multiple restaurants per owner** `[COULD]`
- An owner can manage more than one restaurant and switch between them in their dashboard.

---

## 8. Menu Management

**AC-MENU-01 — Categories** `[MUST]`
- Given a restaurant owner
- When they create, rename, reorder or delete menu categories (e.g. "Rice Dishes", "Soups", "Drinks")
- Then the customer menu reflects the change and display order.

**AC-MENU-02 — Deleting a non-empty category** `[MUST]`
- Given a category that still contains items
- When the owner deletes it
- Then they are asked to move or delete the items first; items are never silently orphaned.

**AC-MENU-03 — Create menu item** `[MUST]`
- Given an owner creates an item with name, description, price (pesewas), category, image and optional tags (spicy, vegetarian, contains nuts)
- Then the item is saved and appears on the public menu if marked available.

**AC-MENU-04 — Price validation** `[MUST]`
- A price must be a positive integer in pesewas; zero, negative and decimal values are rejected by the server.

**AC-MENU-05 — Availability toggle** `[MUST]`
- Given an owner marks an item "Sold out"
- Then it is immediately disabled on the customer menu
- And any cart containing it is flagged at checkout.

**AC-MENU-06 — Options and add-ons** `[SHOULD]`
- Given an item with option groups (e.g. "Protein: Chicken / Fish / Beef", required, choose 1; "Extras: Egg, Shito, Plantain", optional, choose up to 3), each option with an optional extra price
- Then the customer must satisfy required groups and min/max selection rules before adding to cart
- And the server re-validates these rules at checkout.

**AC-MENU-07 — Stock tracking** `[COULD]`
- Given an item with a daily stock quantity
- When stock reaches 0 through orders
- Then the item automatically becomes unavailable
- And stock is decremented inside the order-creation transaction with row locking.

**AC-MENU-08 — Price changes do not affect past orders** `[MUST]`
- Given an owner changes an item's price or name
- Then existing orders still show the original name and price (snapshotted in `OrderItems`).

**AC-MENU-09 — Deleting a menu item** `[MUST]`
- Deleted items are soft-deleted, disappear from the menu, and still render correctly in historical orders.

**AC-MENU-10 — Bulk availability** `[COULD]`
- The owner can mark an entire category available or unavailable in one action.

---

## 9. Cart

**AC-CART-01 — Add to cart** `[MUST]`
- Given a customer on a restaurant menu
- When they add an item with a quantity and valid options
- Then the cart updates immediately (Zustand), shows the item count badge, and displays the running subtotal.

**AC-CART-02 — Single-restaurant cart** `[MUST]`
- Given the cart already contains items from restaurant A
- When the customer adds an item from restaurant B
- Then a dialog explains that the cart can only hold one restaurant's items and offers "Start new cart" or "Cancel".

**AC-CART-03 — Update and remove** `[MUST]`
- The customer can change quantity (1–50) and remove items; the subtotal updates instantly.

**AC-CART-04 — Same item, different options** `[SHOULD]`
- Given the customer adds the same dish twice with different options
- Then they appear as separate cart lines; identical selections merge into one line with a higher quantity.

**AC-CART-05 — Cart persistence** `[MUST]`
- Given a customer refreshes the page or returns later on the same device
- Then their cart is still there.
- (Implementation note: since browser storage is acceptable for this non-sensitive state, Zustand `persist` or a server-side cart for logged-in users is acceptable; the cart must never be the source of truth for prices.)

**AC-CART-06 — Guest cart merges on login** `[SHOULD]`
- Given a guest builds a cart and then logs in
- Then the cart is kept and associated with the account.

**AC-CART-07 — Stale cart detection** `[MUST]`
- Given items in the cart have changed price, become unavailable or the restaurant has closed since they were added
- When the customer opens the cart or proceeds to checkout
- Then the changes are shown clearly and the customer must acknowledge them before continuing.

**AC-CART-08 — Minimum order** `[SHOULD]`
- Given the restaurant has a minimum order amount
- When the subtotal is below it
- Then checkout is disabled with a message showing the amount still needed.

---

## 10. Checkout & Order Creation

**AC-CHK-01 — Checkout summary** `[MUST]`
- Given a customer proceeds to checkout
- Then they see items, options, quantities, subtotal, delivery fee, service fee (if any), discount (if any) and grand total, plus delivery address, contact phone and payment method selection.

**AC-CHK-02 — Server-side price calculation** `[MUST]`
- Given a checkout request
- Then the server ignores any prices or totals sent by the client and recalculates every line price, option price, fee and total from the database
- And a test proves that tampering with client-side prices has no effect on the amount charged.

**AC-CHK-03 — Delivery fee calculation** `[MUST]`
- Given the restaurant's coordinates and the delivery address coordinates
- Then the delivery fee is calculated from route distance (Google Routes API, with Haversine distance as a fallback) using a documented formula (e.g. base fee + per-km fee)
- And the fee shown at checkout equals the fee charged.

**AC-CHK-04 — Out of delivery range** `[MUST]`
- Given the delivery address is beyond the restaurant's delivery radius
- Then checkout is blocked with a clear message.

**AC-CHK-05 — Availability validation** `[MUST]`
- Given a checkout request
- When the restaurant is closed or suspended, or any item is unavailable, deleted or out of stock
- Then order creation fails with `409` and a list of the problem items, and nothing is written to the database.

**AC-CHK-06 — Atomic order creation** `[MUST]`
- Given a valid checkout
- Then the `Order`, all `OrderItems`, `OrderItemOptions`, stock decrements and the initial `OrderStatusHistory` entry are created in a single Sequelize transaction
- And if any step fails, everything is rolled back.

**AC-CHK-07 — Snapshotting** `[MUST]`
- Each `OrderItem` stores the item name, unit price, selected options and option prices at order time, and the order stores a snapshot of the delivery address, coordinates and contact phone.

**AC-CHK-08 — Human-readable order number** `[SHOULD]`
- Each order has a unique, human-friendly reference (e.g. `CH-260926-4821`) in addition to its database ID, shown to customers, restaurants and riders.

**AC-CHK-09 — Idempotent order submission** `[MUST]`
- Given the customer double-clicks "Place order" or the network retries the request
- When the same idempotency key is sent twice
- Then only one order is created, and the second request returns the first order
- And the "Place order" button is disabled while the request is pending.

**AC-CHK-10 — Delivery instructions** `[SHOULD]`
- The customer can add a note for the restaurant (e.g. "less pepper") and a separate note for the rider (e.g. "call when at the gate").

**AC-CHK-11 — Scheduled orders** `[COULD]`
- The customer can schedule an order for a later time slot within the restaurant's opening hours.

**AC-CHK-12 — Promo codes** `[COULD]`
- Given a valid promo code
- Then the discount is applied server-side according to its rules (percentage/fixed, minimum spend, expiry, usage limit per user and in total), and invalid codes return a clear reason.

---

## 11. Payments

### 11.1 Initiation

**AC-PAY-01 — Initiate Paystack payment** `[MUST]`
- Given an order in status `PENDING_PAYMENT`
- When the customer chooses to pay online
- Then the server initialises a Paystack transaction with the server-calculated amount in pesewas, currency `GHS`, a unique reference and the order ID in metadata
- And a `Payment` record is created with status `PENDING`
- And the customer is redirected to (or shown) the Paystack checkout.

**AC-PAY-02 — Mobile money supported** `[MUST]`
- Given the Paystack checkout
- Then the customer can pay with MTN MoMo, Telecel Cash and AirtelTigo Money, as well as card.

**AC-PAY-03 — Secret keys never exposed** `[MUST]`
- The Paystack secret key exists only in server environment variables; only the public key may ever reach the frontend, and no key is committed to Git.

### 11.2 Webhooks & Verification

**AC-PAY-04 — Webhook signature verification** `[MUST]`
- Given a request to the Paystack webhook endpoint
- When the `x-paystack-signature` header does not match the HMAC-SHA512 of the raw request body computed with the secret key
- Then the request is rejected with `401` and nothing is processed
- And the endpoint uses the raw body (not re-serialised JSON) for the signature check.

**AC-PAY-05 — Server-side transaction verification** `[MUST]`
- Given a valid `charge.success` webhook
- Then the server calls Paystack's verify-transaction endpoint and confirms that status is `success`, the amount equals the order total exactly, the currency is `GHS`, and the reference matches a known pending payment
- And only then marks the `Payment` as `SUCCESS` and the order as `PAID`.

**AC-PAY-06 — Amount mismatch** `[MUST]`
- Given a successful transaction whose amount differs from the order total
- Then the order is not marked paid, the payment is flagged `AMOUNT_MISMATCH`, and an admin alert is raised.

**AC-PAY-07 — Idempotent webhook handling** `[MUST]`
- Given Paystack delivers the same webhook event more than once
- Then the order is transitioned and notifications are sent only once
- And duplicate deliveries still receive `200` so Paystack stops retrying.

**AC-PAY-08 — Fast acknowledgement** `[SHOULD]`
- The webhook endpoint responds `200` quickly and moves heavy work (notifications, restaurant alert) to a BullMQ job.

**AC-PAY-09 — Frontend is never the source of truth** `[MUST]`
- Given the customer returns from Paystack to the callback page
- Then the page shows "Confirming payment…" and polls or listens for the server-confirmed status
- And a redirect or client-side "success" message alone never marks an order as paid.

**AC-PAY-10 — Payment failure** `[MUST]`
- Given a failed or abandoned payment
- Then the order remains `PENDING_PAYMENT`, the customer sees a clear failure message and can retry payment on the same order.

**AC-PAY-11 — Unpaid order expiry** `[MUST]`
- Given an order still `PENDING_PAYMENT` after 30 minutes
- Then a scheduled job cancels it with reason `PAYMENT_TIMEOUT` and releases any reserved stock.

**AC-PAY-12 — Reconciliation job** `[SHOULD]`
- Given pending payments older than 10 minutes without a webhook
- Then a scheduled job verifies them with Paystack and updates their status, so a missed webhook never leaves a paid order stuck.

### 11.3 Cash on Delivery & Records

**AC-PAY-13 — Cash on delivery** `[COULD]`
- Given the platform enables cash on delivery
- When a customer selects it
- Then the order skips `PENDING_PAYMENT` and goes to the restaurant immediately, marked `PAYMENT_METHOD = CASH`
- And the rider must confirm cash collected when completing delivery.

**AC-PAY-14 — Payment history** `[MUST]`
- Every payment attempt is stored with provider, reference, amount, currency, status, channel (card/momo) and timestamps, and is visible to admins.

**AC-PAY-15 — Receipts** `[MUST]`
- Given an order is paid
- Then the customer receives an email receipt and can view the receipt in the app, showing the itemised breakdown, fees, total, payment method and reference.

**AC-PAY-16 — Secondary provider** `[COULD]`
- If Flutterwave is implemented, payment logic sits behind a common provider interface so the order flow does not depend on a specific provider.

---

## 12. Order Lifecycle & State Machine

**AC-ORD-01 — Defined statuses** `[MUST]`
The system supports exactly these statuses:

| Status | Meaning |
|---|---|
| `PENDING_PAYMENT` | Order created, awaiting payment confirmation |
| `PAID` | Payment verified, awaiting restaurant response |
| `ACCEPTED` | Restaurant accepted the order |
| `REJECTED` | Restaurant declined the order |
| `PREPARING` | Food is being prepared |
| `READY_FOR_PICKUP` | Food is ready for the rider |
| `RIDER_ASSIGNED` | A rider has accepted the delivery |
| `PICKED_UP` | Rider has collected the food |
| `DELIVERED` | Customer has received the order |
| `CANCELLED` | Order cancelled (with a reason) |

**AC-ORD-02 — Allowed transitions only** `[MUST]`
- Given any status update request
- When the transition is not in the allowed transition map (e.g. `PAID → DELIVERED`, `DELIVERED → PREPARING`)
- Then the API returns `409` with code `INVALID_STATUS_TRANSITION` and the order is unchanged.

**AC-ORD-03 — Transitions restricted by role** `[MUST]`

| Transition | Who can perform it |
|---|---|
| `PENDING_PAYMENT → PAID` | System only (verified webhook) |
| `PAID → ACCEPTED / REJECTED` | Restaurant owner of that order |
| `ACCEPTED → PREPARING → READY_FOR_PICKUP` | Restaurant owner of that order |
| `READY_FOR_PICKUP → RIDER_ASSIGNED` | System (assignment) or admin |
| `RIDER_ASSIGNED → PICKED_UP → DELIVERED` | Assigned rider only |
| `* → CANCELLED` | Per cancellation rules (Section 20) |

**AC-ORD-04 — Status history** `[MUST]`
- Every status change writes an `OrderStatusHistory` row with the old status, new status, actor user ID, actor role, optional reason and timestamp, in the same transaction as the status update.

**AC-ORD-05 — Concurrency safety** `[MUST]`
- Given two actors try to update the same order at the same moment
- Then only one valid transition succeeds (row lock or optimistic locking with a version column), and the other receives `409`.

**AC-ORD-06 — Customer order timeline** `[MUST]`
- Given a customer views an order
- Then they see a visual timeline of every status reached, with times, and the current step highlighted.

**AC-ORD-07 — Terminal states** `[MUST]`
- `DELIVERED`, `REJECTED` and `CANCELLED` are terminal; no further transitions are allowed except refunds, which are tracked separately.

---

## 13. Restaurant Order Handling

**AC-RORD-01 — Incoming order alert** `[MUST]`
- Given an order becomes `PAID`
- Then the restaurant dashboard receives it in real time via Socket.IO, with an audible alert and visual highlight, without a page refresh.

**AC-RORD-02 — Order detail for kitchen** `[MUST]`
- The restaurant sees order number, items, options, quantities, customer notes, order time and elapsed time; the customer's phone number and full address are not shown to the restaurant unless required.

**AC-RORD-03 — Accept or reject** `[MUST]`
- Given a `PAID` order
- When the owner accepts, optionally setting a preparation time, the order becomes `ACCEPTED` and the customer is notified with the estimated time
- When the owner rejects, a reason is required (e.g. "Item out of stock", "Kitchen closing"), the order becomes `REJECTED`, and a full refund is triggered automatically.

**AC-RORD-04 — Auto-reject on no response** `[MUST]`
- Given a `PAID` order not accepted within 5 minutes
- Then a BullMQ delayed job rejects it with reason `RESTAURANT_TIMEOUT`, triggers a refund and notifies the customer and admins.

**AC-RORD-05 — Preparation progress** `[MUST]`
- The owner can move an order through `PREPARING` and `READY_FOR_PICKUP` with one click each, and each change is pushed to the customer in real time.

**AC-RORD-06 — Order board** `[SHOULD]`
- The restaurant dashboard shows orders in columns or tabs by status (New, Preparing, Ready, Out for delivery, Completed) with counts.

**AC-RORD-07 — Order history and daily summary** `[SHOULD]`
- The owner can view past orders filtered by date and status, and a daily summary of order count and revenue.

**AC-RORD-08 — Rider visibility** `[SHOULD]`
- Once a rider is assigned, the restaurant sees the rider's name, photo and ETA to the restaurant.

---

## 14. Rider Onboarding & Availability

**AC-RIDER-01 — Rider application** `[MUST]`
- Given a registered `RIDER`
- When they submit full name, phone, photo, Ghana Card number, vehicle type (motorbike, bicycle, car), plate number (for motorised vehicles), driver's licence and Ghana Card images
- Then the rider profile is created with status `PENDING_APPROVAL` and admins are notified.

**AC-RIDER-02 — Approval** `[MUST]`
- Given an admin approves or rejects a rider
- Then the rider is notified, and only approved riders can go online or receive deliveries.

**AC-RIDER-03 — Online / offline toggle** `[MUST]`
- Given an approved rider
- When they toggle "Online"
- Then they become eligible for delivery offers and their location begins to be shared
- When they toggle "Offline"
- Then they stop receiving offers and location sharing stops, but they must still complete any active delivery.

**AC-RIDER-04 — Location permission** `[MUST]`
- Given a rider tries to go online without granting location permission
- Then they are blocked with instructions on enabling location.

**AC-RIDER-05 — Stale riders go offline automatically** `[SHOULD]`
- Given an online rider has sent no location update for 5 minutes
- Then they are marked offline automatically and excluded from assignment.

**AC-RIDER-06 — One active delivery at a time** `[MUST]`
- A rider cannot hold more than one active delivery unless batching is explicitly implemented.

**AC-RIDER-07 — Earnings view** `[SHOULD]`
- The rider can see completed deliveries and earnings per day, week and month.

---

## 15. Rider Assignment

**AC-ASSIGN-01 — Assignment trigger** `[MUST]`
- Given an order reaches `ACCEPTED` (or `READY_FOR_PICKUP`, according to the documented business rule)
- Then the assignment process starts automatically as a BullMQ job.

**AC-ASSIGN-02 — Candidate selection** `[MUST]`
- Given the restaurant's coordinates
- Then candidate riders are those who are approved, online, not on an active delivery, have a location update within the last 2 minutes and are within a configured radius (e.g. 5 km)
- And candidates are ranked by distance (Haversine or MySQL spatial query).

**AC-ASSIGN-03 — Sequential offers** `[MUST]`
- Given a ranked list of riders
- Then the delivery is offered to the nearest rider first, who sees restaurant name, pickup distance, drop-off area, and delivery earnings
- And the offer expires after 60 seconds.

**AC-ASSIGN-04 — Decline or timeout** `[MUST]`
- Given the rider declines or the offer expires
- Then the next rider in the list receives the offer, and the declining rider is not offered the same order again.

**AC-ASSIGN-05 — Race-safe acceptance** `[MUST]`
- Given two riders attempt to accept the same delivery at the same moment
- Then exactly one succeeds (transaction with row lock), and the other sees "This delivery has already been taken".

**AC-ASSIGN-06 — No rider available** `[MUST]`
- Given no rider accepts after all candidates are exhausted
- Then the radius widens once and the process retries, and if still unassigned after a configurable period (e.g. 10 minutes), admins are alerted and the customer is informed of the delay.

**AC-ASSIGN-07 — Manual assignment** `[MUST]`
- An admin can manually assign or reassign any eligible rider to an order, and this is recorded in the status history.

**AC-ASSIGN-08 — Rider unassignment** `[SHOULD]`
- Given an assigned rider cannot continue before pickup (e.g. breakdown)
- When they or an admin unassign them with a reason
- Then the order returns to the assignment pool and the event is logged.

---

## 16. Delivery Execution

**AC-DEL-01 — Pickup navigation** `[MUST]`
- Given a rider has accepted a delivery
- Then they see the restaurant's location on a map with an "Open in Google Maps" button for turn-by-turn navigation.

**AC-DEL-02 — Confirm pickup** `[MUST]`
- Given the order is `READY_FOR_PICKUP` and the rider is assigned
- When the rider taps "Picked up"
- Then the order becomes `PICKED_UP` and the customer is notified.

**AC-DEL-03 — Pickup geofence** `[SHOULD]`
- Given the rider marks "Picked up" while more than 200 m from the restaurant
- Then they are warned and must confirm, and the event is flagged for admin review.

**AC-DEL-04 — Drop-off details** `[MUST]`
- After pickup, the rider sees the customer's first name, delivery pin, Ghana Post GPS address, landmark, rider instructions and a one-tap call button.

**AC-DEL-05 — Phone privacy** `[SHOULD]`
- The customer's phone number is shown to the rider only while the delivery is active and is hidden once the order is completed.

**AC-DEL-06 — Delivery confirmation code** `[SHOULD]`
- Given an order is `PICKED_UP`
- Then the customer sees a 4-digit delivery code in the app
- And the rider must enter this code to mark the order `DELIVERED`, preventing false delivery claims.

**AC-DEL-07 — Complete delivery** `[MUST]`
- Given the rider confirms delivery (with code, if implemented)
- Then the order becomes `DELIVERED`, the rider becomes available again, location sharing for that order stops, and the customer is invited to leave a review.

**AC-DEL-08 — Failed delivery** `[SHOULD]`
- Given the rider cannot reach the customer
- When they report "Customer unreachable" after attempting to call
- Then admins are alerted with the rider's location and call attempts, and the outcome is handled per the documented policy.

---

## 17. Real-Time Tracking (Socket.IO)

**AC-RT-01 — Authenticated sockets** `[MUST]`
- Given a client connects to Socket.IO
- Then the JWT from the HttpOnly cookie is verified during the handshake
- And unauthenticated connections are rejected.

**AC-RT-02 — Room isolation** `[MUST]`
- Each order has its own room (`order:<id>`). Only the order's customer, its restaurant, the assigned rider and admins may join
- And an attempt to join another order's room is rejected and logged.

**AC-RT-03 — Status updates** `[MUST]`
- Given an order changes status
- Then every authorised participant receives the update within 2 seconds, without refreshing the page.

**AC-RT-04 — Live rider location** `[MUST]`
- Given an order is `RIDER_ASSIGNED` or `PICKED_UP`
- Then the rider's location is sent every 5–10 seconds
- And the customer sees the rider's marker move on the map.

**AC-RT-05 — Location throttling and validation** `[MUST]`
- The server ignores location updates more frequent than once per 3 seconds per rider, and rejects coordinates outside valid ranges or implausibly far from the previous point.

**AC-RT-06 — Location storage** `[SHOULD]`
- The latest rider location is kept in Redis for fast reads; location history for an order is stored in MySQL at a lower frequency (e.g. every 30 seconds) for dispute resolution.

**AC-RT-07 — Reconnection** `[MUST]`
- Given a client loses connection and reconnects
- Then it automatically rejoins its rooms and fetches the current order state via REST, so no missed update leaves stale data on screen.

**AC-RT-08 — Connection indicator** `[SHOULD]`
- Given the socket is disconnected
- Then the UI shows a subtle "Reconnecting…" indicator.

**AC-RT-09 — Tracking stops after delivery** `[MUST]`
- Once an order is `DELIVERED` or `CANCELLED`, no further location data for it is broadcast.

**AC-RT-10 — Multi-instance readiness** `[COULD]`
- The Socket.IO Redis adapter is configured so real-time events work across multiple backend instances.

---

## 18. Maps, Geocoding & ETA

**AC-MAP-01 — Map rendering** `[MUST]`
- Maps render correctly on the address picker, restaurant page, rider screens and customer tracking page, with markers for restaurant, customer and rider as relevant.

**AC-MAP-02 — Geocoding** `[MUST]`
- Given an address or place search, forward geocoding returns coordinates; given a pin, reverse geocoding returns a readable area name.

**AC-MAP-03 — ETA** `[SHOULD]`
- Given an active delivery
- Then the customer sees an ETA derived from the Google Routes API, refreshed at most once per minute.

**AC-MAP-04 — API key protection** `[MUST]`
- Browser Maps keys are restricted by HTTP referrer, and server-side Geocoding/Routes calls use a separate, server-only key.

**AC-MAP-05 — Cost control** `[SHOULD]`
- Geocoding and distance results are cached in Redis where appropriate, and ETA calls are rate-limited per order.

**AC-MAP-06 — Graceful failure** `[MUST]`
- Given a Maps API call fails
- Then the app falls back to straight-line (Haversine) distance for fees and a rough ETA, and does not crash.

---

## 19. Notifications (Email, SMS, In-App)

**AC-NOTIF-01 — Notification matrix** `[MUST]`
The following events trigger notifications through the listed channels:

| Event | Customer | Restaurant | Rider | Admin |
|---|---|---|---|---|
| Account registration / OTP | SMS + Email | SMS + Email | SMS + Email | — |
| Password reset / changed | SMS or Email | SMS or Email | SMS or Email | — |
| Order paid | Email receipt + In-app | In-app (sound) | — | — |
| Order accepted (with ETA) | SMS + In-app | — | — | — |
| Order rejected / auto-rejected | SMS + Email + In-app | — | — | In-app |
| Rider assigned | In-app | In-app | In-app | — |
| Order picked up | SMS + In-app | In-app | — | — |
| Order delivered | In-app + Email | In-app | In-app | — |
| Refund processed | SMS + Email | — | — | — |
| Delivery offer | — | — | In-app (sound) | — |
| Restaurant/rider approved or rejected | — | SMS + Email | SMS + Email | — |
| No rider found / payment mismatch | — | — | — | In-app + Email |

**AC-NOTIF-02 — Asynchronous sending** `[MUST]`
- All email and SMS are sent via BullMQ jobs, never inline in the request, so a slow provider cannot slow down or fail the API response.

**AC-NOTIF-03 — Retries** `[MUST]`
- Failed sends are retried with exponential backoff (e.g. 3 attempts), and permanently failed jobs are recorded and visible to admins.

**AC-NOTIF-04 — No duplicates** `[MUST]`
- Each notification job has a deterministic job ID (e.g. `order:<id>:status:<status>:sms`) so the same event never sends twice.

**AC-NOTIF-05 — Email templates** `[MUST]`
- Emails use branded CibusHub HTML templates (with a plain-text alternative) for registration, verification, password reset, receipt, order updates and refunds, and render correctly in Gmail and on mobile.

**AC-NOTIF-06 — SMS content** `[MUST]`
- SMS messages are under 160 characters where possible, include the order number, use a registered sender ID (e.g. `CibusHub`) and contain no sensitive data beyond the OTP where applicable.

**AC-NOTIF-07 — In-app notification centre** `[SHOULD]`
- Each user has a notification list with unread count, mark-as-read and mark-all-as-read, delivered in real time via Socket.IO.

**AC-NOTIF-08 — Notification log** `[SHOULD]`
- Every notification sent is logged with channel, recipient (masked), template, status and provider response for troubleshooting.

**AC-NOTIF-09 — Preferences** `[COULD]`
- Customers can opt out of marketing messages, while transactional messages (OTP, order updates) remain on.

---

## 20. Cancellations & Refunds

**AC-CANC-01 — Customer cancellation window** `[MUST]`
- Given an order in `PENDING_PAYMENT` or `PAID` (not yet accepted)
- When the customer cancels
- Then it becomes `CANCELLED` with the customer's reason and, if paid, a full refund is initiated.

**AC-CANC-02 — Cancellation after acceptance** `[MUST]`
- Given an order is `ACCEPTED` or later
- Then the customer cannot cancel directly in the app and is shown how to contact support.

**AC-CANC-03 — Admin cancellation** `[MUST]`
- An admin can cancel any non-terminal order with a mandatory reason and choose full, partial or no refund.

**AC-CANC-04 — Refund processing** `[MUST]`
- Given a refund is required
- Then it is initiated through the Paystack Refund API as a background job
- And a `Refund` record is stored with amount, reason, initiator, provider reference and status (`PENDING`, `PROCESSED`, `FAILED`).

**AC-CANC-05 — Refund amount limits** `[MUST]`
- The total refunded for an order can never exceed the amount paid.

**AC-CANC-06 — Stock release** `[SHOULD]`
- If stock tracking is implemented, cancelled or rejected orders return their stock quantities.

**AC-CANC-07 — Refund notification** `[MUST]`
- The customer is notified when a refund is initiated and when it is processed, including the expected time for it to reach their account.

---

## 21. Reviews & Ratings

**AC-REV-01 — Eligibility** `[MUST]`
- Only the customer who placed an order can review it, only after it is `DELIVERED`, and only once per order.

**AC-REV-02 — Review content** `[MUST]`
- A review contains a restaurant rating (1–5 stars, required), an optional comment (max 500 characters) and an optional separate rider rating (1–5).

**AC-REV-03 — Review window** `[SHOULD]`
- Reviews can be submitted within 7 days of delivery, and edited within 24 hours of submission.

**AC-REV-04 — Aggregated rating** `[MUST]`
- The restaurant's average rating and review count update after each review and match the underlying data.

**AC-REV-05 — Display** `[MUST]`
- Reviews appear on the restaurant page, newest first, showing customer first name and last initial, stars, comment and date.

**AC-REV-06 — Restaurant reply** `[COULD]`
- The owner can post one public reply per review.

**AC-REV-07 — Moderation** `[SHOULD]`
- Admins can hide abusive reviews with a reason; hidden reviews are excluded from display and averages.

**AC-REV-08 — XSS safety** `[MUST]`
- Review text is rendered as plain text; any HTML or script is displayed literally and never executed.

---

## 22. Admin Panel

**AC-ADM-01 — Dashboard overview** `[MUST]`
- Given an admin logs in
- Then they see today's order count, revenue (GMV), active orders by status, online riders, pending approvals, and alerts (unassigned orders, failed payments/refunds).

**AC-ADM-02 — User management** `[MUST]`
- Admins can search, filter (role, status) and view users, and suspend or reactivate accounts with a reason.

**AC-ADM-03 — Restaurant management** `[MUST]`
- Admins can review pending restaurants (including documents), approve, reject with reason, suspend and reactivate restaurants, and view each restaurant's orders and performance.

**AC-ADM-04 — Rider management** `[MUST]`
- Admins can review rider applications and documents, approve or reject, suspend riders and see every rider's live status and location on a map.

**AC-ADM-05 — Order management** `[MUST]`
- Admins can search orders by order number, customer phone or restaurant; filter by status and date; view the full timeline, payment details and location history; and reassign riders or cancel orders.

**AC-ADM-06 — Payment and refund management** `[MUST]`
- Admins can view all payments and refunds, filter by status, see flagged payments (amount mismatch, stuck pending) and trigger re-verification.

**AC-ADM-07 — Audit log** `[MUST]`
- Every admin action (approve, reject, suspend, cancel, refund, reassign, settings change) is written to an append-only `AuditLog` with actor, action, target, before/after values, IP and timestamp
- And admins can view and filter the audit log.

**AC-ADM-08 — Admins cannot act silently** `[MUST]`
- Sensitive actions (suspension, refunds, cancellations) require a reason and a confirmation dialog.

**AC-ADM-09 — Review moderation** `[SHOULD]`
- Admins can view, hide and restore reviews.

---

## 23. Super Admin

**AC-SADM-01 — Manage admins** `[MUST]`
- Only a `SUPER_ADMIN` can create, suspend or remove `ADMIN` accounts.

**AC-SADM-02 — Platform configuration** `[MUST]`
- Only a `SUPER_ADMIN` can change platform settings: delivery fee formula (base fee, per-km rate), service fee, commission rate, assignment radius, offer timeout, restaurant response timeout, unpaid order expiry and enabled payment methods
- And every change is audited with the old and new values.

**AC-SADM-03 — Settings take effect without redeploying** `[SHOULD]`
- Configuration changes apply to new orders without restarting the server, and existing orders keep the values they were created with.

**AC-SADM-04 — Protection of the last super admin** `[MUST]`
- The system prevents suspension or demotion of the last remaining `SUPER_ADMIN`.

**AC-SADM-05 — Seeded super admin** `[MUST]`
- The initial super admin is created by a seed script using environment variables, never through the public API.

---

## 24. Analytics & Reporting

**AC-ANL-01 — Admin charts** `[MUST]`
- The admin dashboard shows Recharts charts for orders per day, revenue per day, orders by status, and top restaurants, with a date-range picker (today, 7 days, 30 days, custom).

**AC-ANL-02 — Operational metrics** `[SHOULD]`
- Reports show average restaurant acceptance time, average preparation time, average rider assignment time, average delivery time, and rejection/cancellation rates, all derived from `OrderStatusHistory`.

**AC-ANL-03 — Restaurant analytics** `[SHOULD]`
- Each restaurant owner sees their own order volume, revenue, best-selling items and ratings over time, and cannot see other restaurants' data.

**AC-ANL-04 — Export** `[COULD]`
- Admins can export orders and payments for a date range as CSV.

**AC-ANL-05 — Accuracy** `[MUST]`
- Dashboard totals match the sum of the underlying records for the same period and exclude unpaid, cancelled and refunded amounts as documented.

**AC-ANL-06 — Chart performance** `[SHOULD]`
- Analytics queries use aggregated SQL (GROUP BY) with appropriate indexes and return within 1 second for 30 days of data; heavy results may be cached in Redis for a few minutes.

---

## 25. Image & File Management

**AC-IMG-01 — Upload validation** `[MUST]`
- Given an image upload (logo, cover, menu item, profile photo, document)
- Then only JPEG, PNG and WebP (and PDF for documents) are accepted, the file type is verified by content (magic bytes), not just by extension, and files over 5 MB are rejected.

**AC-IMG-02 — Optimisation** `[MUST]`
- Images are resized and compressed (Sharp and/or Cloudinary transformations) and served in modern formats (WebP/AVIF with `f_auto,q_auto`) at sizes appropriate for each context (thumbnail, card, full).

**AC-IMG-03 — Private documents** `[MUST]`
- Verification documents (Ghana Card, licence, business registration) are stored as private/authenticated assets and accessible only to admins via signed, short-lived URLs.

**AC-IMG-04 — Replacing images** `[SHOULD]`
- When an image is replaced or its record deleted, the old Cloudinary asset is deleted as well.

**AC-IMG-05 — Placeholders** `[MUST]`
- Missing or failed images show a branded placeholder, and images use lazy loading below the fold.

---

## 26. Background Jobs & Scheduling

**AC-JOB-01 — Queues** `[MUST]`
- BullMQ queues exist for at least: notifications, payments (verification/reconciliation/refunds), assignment and scheduled maintenance.

**AC-JOB-02 — Required jobs** `[MUST]`

| Job | Trigger | Behaviour |
|---|---|---|
| Unpaid order expiry | Delayed, 30 min after creation | Cancel if still `PENDING_PAYMENT` |
| Restaurant response timeout | Delayed, 5 min after `PAID` | Auto-reject and refund if not accepted |
| Rider offer timeout | Delayed, 60 s after each offer | Offer to next rider |
| Payment reconciliation | Every 10 min | Verify stuck pending payments |
| Stale rider cleanup | Every 2 min | Set riders with no recent location offline |
| Expired token/OTP cleanup | Daily | Remove expired refresh tokens and reset records |
| Daily summary | Daily at 23:59 Accra time | Email summary to admins (`[COULD]`) |

**AC-JOB-03 — Idempotent jobs** `[MUST]`
- Every job re-checks current state before acting (e.g. the expiry job does nothing if the order was paid in the meantime).

**AC-JOB-04 — Failure handling** `[MUST]`
- Jobs have retry limits with backoff, failed jobs are kept for inspection, and job failures are reported to Sentry.

**AC-JOB-05 — Queue dashboard** `[COULD]`
- A protected Bull Board (or similar) view is available to super admins.

---

## 27. Security

**AC-SEC-01 — HTTP security headers** `[MUST]`
- Helmet is enabled with a Content Security Policy appropriate for Google Maps, Paystack and Cloudinary.

**AC-SEC-02 — CORS** `[MUST]`
- CORS allows only the known frontend origin(s) with `credentials: true`; wildcard origins are never used with credentials.

**AC-SEC-03 — CSRF protection** `[MUST]`
- Because authentication uses cookies, state-changing requests are protected by `SameSite` cookies plus a CSRF token or origin check.

**AC-SEC-04 — Rate limiting** `[MUST]`
- Redis-backed rate limits apply globally (e.g. 100 requests/min per IP) with stricter limits on login, registration, OTP, password reset and checkout.

**AC-SEC-05 — SQL injection** `[MUST]`
- All queries use Sequelize model methods or parameterised replacements; no user input is ever concatenated into raw SQL.

**AC-SEC-06 — XSS** `[MUST]`
- React's default escaping is relied on; `dangerouslySetInnerHTML` is not used with user content.

**AC-SEC-07 — Mass assignment** `[MUST]`
- Create and update endpoints only accept explicitly allowed fields (Zod schemas with `.strict()` or equivalent), so users cannot set fields such as `role`, `status`, `rating` or `totalAmount`.

**AC-SEC-08 — Sensitive data exposure** `[MUST]`
- Password hashes, tokens, OTPs and internal fields are excluded from API responses (Sequelize `defaultScope` excludes them), and logs mask phone numbers, emails and tokens.

**AC-SEC-09 — Secrets management** `[MUST]`
- All secrets live in environment variables, `.env` is in `.gitignore`, an `.env.example` documents required variables, and the app refuses to start if a required variable is missing.

**AC-SEC-10 — HTTPS** `[MUST]`
- Production traffic is HTTPS only, and HTTP redirects to HTTPS.

**AC-SEC-11 — Dependency security** `[SHOULD]`
- `npm audit` shows no high or critical vulnerabilities at submission, and Dependabot (or similar) is enabled.

**AC-SEC-12 — Request size limits** `[MUST]`
- JSON bodies are limited (e.g. 100 kb), and upload size limits are enforced before processing.

**AC-SEC-13 — IDOR test suite** `[MUST]`
- An automated test suite attempts cross-user and cross-restaurant access for every resource type and confirms all attempts are denied.

---

## 28. Performance & Scalability

**AC-PERF-01 — API response times** `[SHOULD]`
- Under normal load, 95% of read endpoints respond within 300 ms and write endpoints within 800 ms (excluding third-party calls).

**AC-PERF-02 — No N+1 queries** `[MUST]`
- List endpoints use Sequelize `include` or batched queries; no endpoint performs one query per list item.

**AC-PERF-03 — Indexes** `[MUST]`
- Indexes exist at least on foreign keys, `orders(status)`, `orders(customerId, createdAt)`, `orders(restaurantId, createdAt)`, `payments(reference)` (unique), `users(email)` and `users(phone)` (unique), and FULLTEXT on restaurant and menu item names/descriptions.

**AC-PERF-04 — Caching** `[SHOULD]`
- Public, frequently read data (restaurant lists, menus) is cached in Redis with short TTLs and invalidated when an owner edits it.

**AC-PERF-05 — Frontend performance** `[SHOULD]`
- On a mid-range Android phone over a simulated 3G/4G connection, the home page reaches Largest Contentful Paint within 3 seconds, and the Lighthouse Performance score is 80 or higher on mobile.

**AC-PERF-06 — Code splitting** `[SHOULD]`
- Routes are lazy-loaded so customers never download the admin, restaurant or rider dashboard code.

**AC-PERF-07 — Load test** `[COULD]`
- A documented load test (e.g. k6 or Artillery) shows the system handling 50 concurrent users placing orders without errors.

---

## 29. Frontend UX, Accessibility & Responsiveness

**AC-UX-01 — Mobile-first** `[MUST]`
- All customer and rider screens work well from 360 px wide upwards, and restaurant and admin dashboards are usable on tablets and desktops.

**AC-UX-02 — Loading states** `[MUST]`
- Every data-driven view shows skeletons or spinners while loading; no blank screens or layout jumps.

**AC-UX-03 — Empty states** `[MUST]`
- Every list has an empty state with a helpful message and, where relevant, a next action.

**AC-UX-04 — Error states** `[MUST]`
- API errors show friendly messages (toasts or inline), network failures offer a "Try again" button, and a React error boundary catches rendering errors with a recovery page.

**AC-UX-05 — Form UX** `[MUST]`
- Forms (React Hook Form + Zod) show inline validation messages per field, disable the submit button while submitting, and preserve input when submission fails.

**AC-UX-06 — Optimistic and cached updates** `[SHOULD]`
- TanStack Query invalidates or updates caches after mutations so lists refresh automatically, and appropriate `staleTime` values avoid unnecessary refetching.

**AC-UX-07 — Confirmation for destructive actions** `[MUST]`
- Deleting, cancelling, rejecting or suspending always requires a confirmation dialog.

**AC-UX-08 — Accessibility** `[SHOULD]`
- All interactive elements are keyboard accessible with visible focus states; images have alt text; form fields have labels; colour contrast meets WCAG AA; status is never conveyed by colour alone; the Lighthouse Accessibility score is 90 or higher.

**AC-UX-09 — Motion** `[SHOULD]`
- Framer Motion animations are subtle and respect `prefers-reduced-motion`.

**AC-UX-10 — Dark mode** `[COULD]`
- The app supports light and dark themes.

**AC-UX-11 — PWA** `[COULD]`
- The app is installable to the home screen with a manifest and icons, and shows an offline page when there is no connection.

**AC-UX-12 — Consistent design** `[MUST]`
- shadcn/ui components, Tailwind tokens and Lucide icons are used consistently, with a defined colour palette, typography scale and spacing system for the CibusHub brand.

---

## 30. API Design & Documentation

**AC-API-01 — RESTful conventions** `[MUST]`
- Endpoints use plural nouns, correct HTTP methods and status codes (`200`, `201`, `204`, `400`, `401`, `403`, `404`, `409`, `422`, `429`, `500`), and are versioned under `/api/v1`.

**AC-API-02 — Swagger/OpenAPI** `[MUST]`
- Every endpoint is documented in OpenAPI with request schemas, response schemas, auth requirements and example payloads, served at `/api/docs` (disabled or protected in production).

**AC-API-03 — Docs match reality** `[SHOULD]`
- Documentation is generated from or validated against the Zod schemas so it cannot drift from the implementation.

**AC-API-04 — Postman/Thunder Client collection** `[SHOULD]`
- A shared collection with environments (local, staging) is included in the repository.

**AC-API-05 — Health check** `[MUST]`
- `GET /api/health` returns `200` with the status of MySQL and Redis connectivity, the app version and uptime, and returns `503` if a dependency is down.

---

## 31. Data Integrity & Database

**AC-DB-01 — Migrations** `[MUST]`
- The schema is managed with Sequelize migrations only (`sync({ force })` is never used in production), and migrations run cleanly on an empty database.

**AC-DB-02 — Seeders** `[MUST]`
- Seeders create a super admin, sample admins, realistic Ghanaian restaurants (e.g. local chop bars, grills, fast food in Accra and Kumasi), menus with local dishes, customers and riders, so the whole flow can be demonstrated immediately.

**AC-DB-03 — Constraints** `[MUST]`
- Foreign keys, `NOT NULL`, unique constraints and ENUMs (or lookup tables) enforce integrity at the database level, not only in application code.

**AC-DB-04 — Relationships** `[MUST]`
- Sequelize associations are defined for all relationships (User–Restaurant, Restaurant–Category–MenuItem, Order–OrderItem–OrderItemOption, Order–Payment–Refund, Order–OrderStatusHistory, Order–Review, User–Address, Rider–Order), with deliberate `onDelete` behaviour.

**AC-DB-05 — ER diagram** `[MUST]`
- An up-to-date ER diagram is included in the documentation.

**AC-DB-06 — Backups** `[MUST]`
- Production database backups run automatically at least daily, and a restore has been tested and documented at least once.

**AC-DB-07 — Character set** `[MUST]`
- The database uses `utf8mb4` so names, dish names and reviews with any characters or emoji are stored correctly.

---

## 32. Testing

**AC-TEST-01 — Unit tests** `[MUST]`
- Vitest or Jest unit tests cover business logic in the service layer, including price and fee calculation, the order state machine, promo code rules, OTP logic and rider ranking.

**AC-TEST-02 — API integration tests** `[MUST]`
- Supertest tests run against a dedicated test database and cover, at minimum:
  - Registration, OTP verification, login, refresh and logout
  - Role and ownership denial for every resource type (IDOR suite)
  - Checkout with valid carts, unavailable items, closed restaurants and tampered prices
  - Paystack webhook with valid signature, invalid signature, duplicate event and amount mismatch
  - Every allowed and a representative set of disallowed status transitions
  - Concurrent rider acceptance of the same delivery

**AC-TEST-03 — End-to-end tests** `[MUST]`
- Playwright tests cover the golden path: customer browses → adds to cart → checks out → (mocked) payment succeeds → restaurant accepts and prepares → rider accepts, picks up and delivers → customer sees `DELIVERED` and leaves a review.

**AC-TEST-04 — External services are mocked in tests** `[MUST]`
- Paystack, SMS, email, Google Maps and Cloudinary are mocked in automated tests; no real messages or charges occur.

**AC-TEST-05 — Coverage** `[SHOULD]`
- Service-layer coverage is at least 70%, with critical modules (orders, payments, auth) at 85% or more.

**AC-TEST-06 — Tests in CI** `[MUST]`
- All tests run on every pull request, and a failing test blocks merging.

**AC-TEST-07 — Manual test checklist** `[SHOULD]`
- A manual QA checklist covers real-device testing on Android and iOS browsers, Paystack test-mode payments (card and mobile money) and live GPS tracking.

---

## 33. DevOps, Deployment & CI/CD

**AC-OPS-01 — Local environment** `[MUST]`
- `docker compose up` starts MySQL, Redis, the Express API and the React app, and a new developer can run the whole system by following the README within 15 minutes.

**AC-OPS-02 — Environment separation** `[MUST]`
- Separate configurations exist for development, test and production, with Paystack test keys outside production.

**AC-OPS-03 — CI pipeline** `[MUST]`
- GitHub Actions runs on every push and pull request: install → lint (ESLint) → format check (Prettier) → unit and integration tests → build.

**AC-OPS-04 — CD pipeline** `[SHOULD]`
- Merges to `main` deploy automatically: frontend to Vercel/Netlify, backend to Render/Railway/Fly.io, with database migrations run as part of deployment.

**AC-OPS-05 — Live deployment** `[MUST]`
- The system is deployed and publicly reachable over HTTPS, with a working frontend URL, API URL and API docs URL.

**AC-OPS-06 — Webhook reachable** `[MUST]`
- The Paystack webhook URL is configured to the deployed backend and verified with a test-mode transaction.

**AC-OPS-07 — Git workflow** `[SHOULD]`
- Work happens on feature branches merged through pull requests, with meaningful commit messages (e.g. Conventional Commits) and a protected `main` branch.

**AC-OPS-08 — Graceful shutdown** `[SHOULD]`
- On `SIGTERM`, the server stops accepting new requests, finishes in-flight requests, and closes MySQL, Redis and BullMQ connections cleanly.

---

## 34. Monitoring, Logging & Reliability

**AC-MON-01 — Error tracking** `[MUST]`
- Sentry is configured for both frontend and backend, captures unhandled errors with context (route, user ID, not personal data), and source maps are uploaded for readable stack traces.

**AC-MON-02 — Structured logging** `[MUST]`
- The backend uses Pino (or Morgan + a structured logger) with JSON logs in production, log levels, and a request ID attached to every log line for a request.

**AC-MON-03 — Uptime monitoring** `[MUST]`
- UptimeRobot (or similar) checks `/api/health` and the frontend every 5 minutes and alerts by email on downtime.

**AC-MON-04 — Third-party failures degrade gracefully** `[MUST]`
- If SMS, email or Maps providers are down, core ordering still works; notifications queue and retry, and Maps falls back as in AC-MAP-06.

**AC-MON-05 — Redis outage behaviour** `[SHOULD]`
- The documented behaviour when Redis is unavailable is tested (e.g. rate limiting fails open with logging, OTP features return a clear temporary error).

**AC-MON-06 — Critical alerts** `[SHOULD]`
- Admins are alerted to payment amount mismatches, repeated webhook failures, orders stuck in one status beyond a threshold, and a spike in failed jobs.

---

## 35. Project Deliverables & Definition of Done

### 35.1 Definition of Done (per feature)

A feature is **done** only when all of the following are true:

- [ ] All `[MUST]` acceptance criteria for the feature pass
- [ ] Server-side Zod validation and role/ownership checks are in place
- [ ] Unit and/or integration tests are written and passing in CI
- [ ] Loading, empty and error states are implemented in the UI
- [ ] The endpoint is documented in Swagger
- [ ] Code passes ESLint and Prettier with no warnings
- [ ] The feature works on a mobile viewport
- [ ] The pull request has been reviewed (self-review checklist if working alone) and merged into `main`
- [ ] The feature works in the deployed environment, not only locally

### 35.2 Final Project Deliverables

**AC-DLV-01 — Source code** `[MUST]`
- A GitHub repository with a clear structure (`/client`, `/server` or a monorepo), `.env.example` files and no committed secrets.

**AC-DLV-02 — README** `[MUST]`
- The README includes a project overview, feature list, tech stack, architecture diagram, setup instructions (Docker and manual), environment variables, test commands, seeded demo credentials for every role and live links.

**AC-DLV-03 — Documentation** `[MUST]`
- Documentation includes the ER diagram, API documentation link, role permission matrix, order state machine diagram, core order flow diagram and a record of key architecture decisions.

**AC-DLV-04 — Live demo** `[MUST]`
- A live deployment with demo accounts for customer, restaurant owner, rider, admin and super admin, working in Paystack test mode.

**AC-DLV-05 — Demo video** `[SHOULD]`
- A 5–10 minute video showing the complete order journey from all roles' perspectives, including live tracking and an admin intervention.

**AC-DLV-06 — Test evidence** `[SHOULD]`
- A CI badge in the README and a coverage report.

### 35.3 Release Readiness Checklist

- [ ] A full order can be completed end to end in production using Paystack test mode
- [ ] Real-time status and location updates work across two different devices
- [ ] OTP SMS and email receipts arrive on real devices
- [ ] Every role sees only what it is allowed to see
- [ ] The IDOR test suite passes
- [ ] No high or critical `npm audit` vulnerabilities
- [ ] Sentry receives a deliberately triggered test error from both frontend and backend
- [ ] The health check reports MySQL and Redis as healthy
- [ ] A database backup exists and a restore has been tested
- [ ] Lighthouse mobile scores meet targets (Performance ≥ 80, Accessibility ≥ 90)

---

*End of CibusHub Acceptance Criteria v1.0*
