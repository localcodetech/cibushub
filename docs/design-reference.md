# Design Reference (from the Stitch mockups)

**What this is:** the useful parts of the Stitch export (`stitch_cibushub_food_delivery_platform.zip`, 54 screens), kept here so the zip can be deleted.
**How to use it:** take the **layout and states** from each screen below, then build with our own rules: [frontendDesign.md](frontendDesign.md) tokens, shadcn/ui and Lucide.
**Source of truth:** [CibusHub_Acceptance_Criteria.md](../CibusHub_Acceptance_Criteria.md) and [frontendDesign.md](frontendDesign.md) always win over this file.

---

## 1. Fix these on every screen

Stitch drifted from the design guide. When you build a screen, change these:

| Stitch did | We do |
|---|---|
| Accra content (East Legon, Osu, Spintex, `GA-492-3810`) | **Kumasi** (Adum, Bantama, Asokwa, Ahodwo, Ayeduase), Ghana Post GPS like `AK-039-5028` |
| Its own colour set (`#FFF8F5`, `#231A11`, `#FCCA66` and about 40 more) | Only the colours in frontendDesign.md §1, through our CSS tokens |
| Epilogue headings | Schibsted Grotesk |
| Material Symbols icons | Lucide |
| ALL-CAPS labels, blur, gradients, emoji (🔥 💬 🇬🇭 🚪) | None of these |
| Invented numbers and claims ("340+ ratings", "Bank-Grade 256-bit Encryption", "No card fees", "Incl. VAT", "Escrow") | Real data from the API, or nothing |
| Order numbers like `#CB-8492` | Our format: `CH-261008-482193` |
| Sankofa on restaurant cards, Nyame Dua on checkout | Sankofa only in order history and Reorder; Nyame Dua only on Payment confirmed |
| "Simulate…", "Preview state…", "Reset 60s timer" buttons | Design-tool helpers: never build them |

---

## 2. Not in our backend: skip, or treat as a later add-on

| Seen on | Feature | Status |
|---|---|---|
| Sign in | Customer / Rider / Kitchen tabs | **Skip.** Login finds the role from the account |
| Sign in | "Sign in with SMS code (no password)", "Remember this device" | Skip |
| Sign in, Register | Google / Apple sign-in | Add-on later (not built) |
| OTP, Forgot password | "Receive code via WhatsApp", "Call me with code" | Add-on later. Codes go by SMS (and email) |
| OTP | "Attempt 2 of 3" | Our limit is **5** wrong tries (AC-AUTH-09) |
| Home | Promo countdown with "Claim" | Later (promo codes, AC-CHK-12) |
| Home | Live feed "Rider Kofi is en route… 2x Waakye" | **Never build.** It shows another customer's order (privacy) |
| Cart, Checkout, Review | Rider tip | Add-on later |
| Cart, Checkout | Eco packaging fee, "no cutlery" option | Not in our pricing |
| Menu | Group order, "Pre-order for 5:30 PM" | Not in the criteria |
| Tracking | Live map with route, quick messages to rider | Map: Step 11. Chat: not in the criteria |
| Rider | "Cashout to MoMo instantly", report traffic jam, demand heatmap | Not in the criteria (payouts are an add-on) |
| Restaurant | Kitchen display (KDS) with stations, "Exhaust pot", shift buffers, public holidays | Not in the criteria. Use the order board instead |
| Admin | Platform kill switch, 2FA / security key on settings, surge or night multipliers, manual MoMo reversal, Zendesk ticket | Not in the criteria |

---

## 3. Screens to use as a guide

Grouped by plan step. "Keep" lists what is worth copying from the Stitch layout.

### Step 6: Authentication

| Screen | Keep |
|---|---|
| Sign in | One field for email or Ghana phone (hint: "+233, 024 or 055 numbers work"), password with show/hide, "Forgot password?", Google/Apple buttons below an "or" line (shown only once built) |
| Register (role choice) | Role cards first (Customer, Restaurant owner, Rider), then full name, phone, email, password, "Continue to phone verification", Terms and Privacy checkbox |
| 6-digit OTP | Six boxes, "Edit phone number", resend countdown (60 s), attempts left message |
| Forgot password / reset | Phone or email choice, code, new password and confirm |
| Pending approval (owner, rider) | "Account submitted for review", what happens next, "Update documents", "Log out" |

### Step 7: Customer browsing and cart

| Screen | Keep |
|---|---|
| Home | Delivery location bar at the top, search, dish category chips (Waakye, Jollof, Banku & Tilapia, Fufu, Kelewele), "Open near you" list with time, rating, delivery fee, minimum order |
| Restaurant listing | Filter chips kept in the URL (Top rated 4.5+, Open now), "Clear all filters", sort |
| Restaurant menu | Cover, info, category tabs with counts, dishes with Add button, sold-out dish with "Back at 6:00 PM", sticky "View cart" bar |
| Dish options bottom sheet | Required choose-1 group (radio), optional up-to-3 group (checkbox) with "+GHS 4.00" prices, special instructions, "Add to cart GHS 57.00" |
| Cart | Price-changed banner ("Accept" / "Remove item"), below-minimum message, quantity steppers, "Start a new cart with Buka Express?" dialog ("Clear cart & add" / "Keep current cart") |
| Location picker bottom sheet | Saved addresses with default, "Adjust pin on map", Ghana Post GPS (optional), landmark (required), quick instruction chips ("Call when at junction"), empty state "No saved addresses yet", validation error state |

### Steps 8 and 9: Checkout and payment

| Screen | Keep |
|---|---|
| Checkout summary | Address card with "Change", items with chosen options, notes for kitchen and rider, contact phone, Mobile Money first then Card, bill summary, "Pay GHS X.XX" |
| Address picker | Map pin, "Use current location", Ghana Post GPS, landmark, rider instructions, saved addresses |
| Confirming payment | Waiting screen that checks with the server (never trusts the redirect), "Resend MoMo prompt", "Change payment method" |
| Payment confirmed | Order number with Copy, items, "Track order", "Download receipt (PDF)" (AC-PAY-17), Nyame Dua placeholder |
| Payment failed | Plain reason, quick MoMo fixes (enough balance, approve the prompt), "Retry payment", "Change payment method", "Back to cart" |
| Rejected order | "Order could not be fulfilled", refund information and receipt, nearby open restaurants |

### Steps 10 and 12: Tracking, history and reviews

| Screen | Keep |
|---|---|
| Live tracking | ETA, rider name with Call, 4-digit delivery code panel (gold), timeline (Paid, Accepted, Preparing, Ready, Picked up, Delivered), "Reconnecting…" banner with Refresh, "Get help" |
| My orders | Tabs (All, Delivered, Cancelled/Refunded), order cards, Sankofa "Reorder" showing which items are unavailable, "View receipt" |
| Review | Restaurant stars, optional rider stars, quick tags ("Hot & fresh", "Missing item"), comment up to 500 characters, "Submit review" / "Skip for now" |

### Step 10: Restaurant owner (tablet and desktop)

| Screen | Keep |
|---|---|
| Live order board | Columns (New, Preparing, Ready, Out for delivery, Completed), "Sound alerts on" + "Test chime", Accept with prep time choice (15 to 45 min), Reject with required reason in a dialog, "Pause new orders 15 min" (maps to the accepting-orders toggle) |
| Menu management | Categories with reorder, "+ Add dish", dish editor (name, price in GHS, description, image, availability), option groups editor |
| Opening hours | Weekly shifts, "Spans past midnight (+1 day)" checkbox, temporary closure with dates and reason |
| Daily summary | Today / 7 days / month tabs, orders, revenue, best sellers, rejections |

### Step 11: Rider app (mobile)

| Screen | Keep |
|---|---|
| Online / offline | Big go-online switch, location permission prompt, "Location blocked" state with "Open phone settings" |
| Delivery offer | 60-second countdown, restaurant, pickup distance, drop-off area, earnings, "Accept" / "Pass", "Offer taken by another rider" state |
| Pickup | Order checklist, "Open in Google Maps", "Confirm picked up", "Report a problem" |
| Drop-off | Customer first name, landmark, instructions, Call, enter 4-digit code, "Complete delivery", "Customer unreachable" report |
| Earnings | Day / week / month, recent trips list, Dwennimmen recognition placeholder |

### Step 13: Admin and super admin (desktop)

Stitch made two versions (`admin_operations_*` and `super_admin_*`). Use one layout for both roles and hide super-admin-only parts by role.

| Screen | Keep |
|---|---|
| Overview | Today's orders, revenue, active orders by status, online riders, pending approvals, alerts (unassigned orders, failed payments), date-range picker, charts |
| Approvals queue | Tabs (Restaurants, Riders, History), document viewer, "Approve", "Reject" with required reason, "Request re-upload" |
| Order management | Search and status tabs, order timeline, "Reassign rider" with reason, "Cancel & refund" with full / partial / none (AC-ADM-07, AC-ADM-08) |
| Payments and refunds | Flagged items queue, payments and refunds table, export CSV |
| Audit log | Filters (actor, action, date), table, detail panel, export |
| Platform settings (super admin) | Delivery fee formula, timeouts, payment methods, commission; every change needs a confirmation dialog with a reason |

### Public landing page (guests)

Use the `cibushub_public_landing_page_*` pair (mobile 360 px and desktop 1280 px): location input with "Use my current location" and "Find food near me", popular restaurants, how it works (3 steps), paying is safe, "Cook with CibusHub", "Ride with CibusHub" (Ghana Card, licence), our story, FAQ (delivery areas in Kumasi, fees, payment, refunds, support), footer.

---

