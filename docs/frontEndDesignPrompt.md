# CibusHub Frontend Design Prompts

**How to use:** send the **master context prompt** first, then the **flow prompts one at a time**. Review each result against the *CibusHub Design Guide* and *Avoid the AI Look* files before sending the next flow.

These prompts work with any AI design or UI tool. If your tool generates code rather than mockups, the same prompts still apply.

---

## 1. Master Context Prompt (send first)

```
You are a senior product designer working with me on CibusHub, a food ordering and delivery platform for Ghana, launching in Kumasi. Design with me one flow at a time. Before designing, ask me about anything important that is unclear instead of assuming.

PRODUCT
CibusHub has four interfaces:
1. Customer web app (mobile-first, 360px and up): browse restaurants, order, pay, track delivery live.
2. Restaurant owner dashboard (tablet and desktop): manage menu, accept and prepare orders.
3. Rider app (mobile): go online, accept deliveries, navigate, confirm delivery.
4. Admin and super admin dashboard (desktop): approvals, orders, payments, audit log, analytics, settings.

USERS AND CONTEXT
- Mostly mid-range Android phones, often on slow or expensive mobile data, often used outdoors in bright sunlight.
- Payment is mainly mobile money (MTN MoMo, Telecel Cash, AirtelTigo Money) and cards, through Paystack.
- Addresses are unreliable, so delivery locations use a map pin (required), an optional Ghana Post GPS address (format AK-039-5028), and a landmark ("opposite Kejetia Market, Adum").
- Prices are in Ghana cedis, shown as "GHS 45.00".

DESIGN SYSTEM (follow exactly)
Colours:
- Forest Green #123C2A leads the brand: primary buttons, header, active tabs, links, focus rings.
- Ashanti Gold #C89B3C is a highlight only: rating stars, badges, delivery code panel. Always with Cocoa text on it. Never as text on cream, never with white text on it.
- Cocoa #2B2118 for all text.
- Warm Cream #F7F0DF for cards, sections and bottom sheets.
- Page background #FBF8F1.
- Muted text #6E6458, borders #E6DDCB, success #1F6B43, danger #A61B1B.
- Terracotta #B9573E: optional, at most one promotional element.
Typography: Schibsted Grotesk (600-800) for headings, Atkinson Hyperlegible (400, 700) for body and interface text.
Corner radius by hierarchy: 16px food photos, 20px bottom sheet tops, 12px inputs and cards, 10px buttons, 8px badges.
Components: shadcn/ui (Radix + Tailwind CSS), themed with the colours above. Icons: Lucide only, one stroke width.
Motion: only in response to user actions (cart badge pop, bottom sheet slide, order status step advancing), 150-300ms, transform and opacity only, respecting reduced motion. No scroll-reveal animations, no decorative or looping motion.

ADINKRA SYMBOLS (each has one job; never decoration, patterns or backgrounds)
- Sankofa ("go back and get it"): order history and the Reorder button.
- Adinkrahene (leadership, greatness): top-rated restaurant badge.
- Dwennimmen (humility and strength): rider recognition.
- Nyame Dua (protection): payment confirmed screen only.
- Gye Nyame: not used in the app interface.
Show symbols as clearly labelled placeholders; I will supply accurate artwork.

CONTENT
- Use realistic but fictional Ghanaian restaurants, dishes (waakye, jollof, banku and tilapia, kelewele, fufu and light soup), names and Kumasi neighbourhoods (Adum, Bantama, Asokwa, Ahodwo, Ayeduase near KNUST).
- No lorem ipsum, no "John Doe", no invented statistics or marketing claims.
- Button labels say exactly what happens ("Place order", "Track rider", "Save address"), and the result uses the same words ("Order placed").
- Errors say what went wrong and what to do next. Empty states suggest the next action.
- Food photos are the visual centrepiece: show them as labelled photo placeholders describing the dish.

EVERY SCREEN MUST INCLUDE
- Loading (skeletons), empty and error states for any data.
- Disabled and unavailable states (closed restaurant, sold-out dish).
- WCAG AA contrast, touch targets of at least 44px, visible labels on every input, visible Forest Green focus rings, and status never shown by colour alone (always a word, plus an icon where useful).

AVOID
Purple or blue gradients, glassmorphism, glowing blobs, emoji icons, ALL-CAPS labels above headings, one coloured word in headlines, identical cards with the same shadow everywhere, middle-dot metadata strings, arrows on every link, generic copy ("Delicious food, delivered fast"), fake phone status bars.

FOR EACH SCREEN, GIVE ME
1. Its purpose in one sentence.
2. The layout from top to bottom.
3. The shadcn/ui components used.
4. Its states (default, loading, empty, error, plus any special state).
5. Any decision you made that I should confirm.

Confirm you understand, list any questions, and wait for my first flow.
```

---

## 2. Flow Prompts (send one at a time)

### Flow 1 — Customer browsing and cart

```
Design the customer browsing flow: Home (delivery location, search, dish categories, open restaurants near me), Restaurant listing with filters and sorting (filters kept in the URL), Restaurant menu (info, open/closed status, category tabs, dishes including a sold-out item), Dish options bottom sheet (required choose-1 group and optional choose-up-to-3 group, with option prices), and Cart (quantities, the single-restaurant rule warning dialog, minimum order message, and a warning when prices changed since items were added).
```

### Flow 2 — Checkout and payment

```
Design checkout and payment: Address picker (map pin required, use current location, Ghana Post GPS, landmark, rider instructions, saved addresses with a default), Checkout summary (items, options, subtotal, delivery fee, total, contact phone, notes for restaurant and rider, payment method with mobile money first), the handoff to Paystack, the "Confirming payment" waiting screen (the app never trusts the redirect alone), Payment confirmed (with the Nyame Dua placeholder), and Payment failed with a retry option.
```

### Flow 3 — Tracking, history and reviews

```
Design order tracking and history: Live tracking (map with rider and route, ETA, rider details with call button, the 4-digit delivery code panel, and an order timeline: Payment confirmed, Restaurant accepted, Preparing, Ready, Picked up, Delivered), a "Reconnecting" indicator, a rejected-order screen with refund information, My Orders history with the Sankofa Reorder button (show which items were skipped as unavailable), and the review screen (restaurant stars, optional rider stars, optional comment up to 500 characters).
```

### Flow 4 — Authentication

```
Design authentication for all roles: Register with a role choice (customer, restaurant owner, rider), phone number input that accepts 024 123 4567 or +233 formats, the 6-digit OTP screen (resend countdown of 60 seconds, attempt-limit error), Login with email or phone, Forgot password and reset, and the "Pending approval" screen restaurant owners and riders see until an admin approves them.
```

### Flow 5 — Restaurant owner dashboard (tablet and desktop)

```
Design the restaurant owner dashboard: the order board with columns (New, Preparing, Ready, Out for delivery, Completed) and a new-order alert with an "enable sound alerts" control, the order detail panel (items, options, notes, elapsed time), Accept with preparation time, Reject with a required reason (confirmation dialog), Menu management (categories with reordering, items with price, image, availability toggle, option groups), Opening hours per day including hours past midnight, the Accepting orders toggle, and a daily summary.
```

### Flow 6 — Rider app

```
Design the rider mobile app: Go online / offline (with a location permission prompt and the blocked state if permission is denied), the delivery offer card with a 60-second countdown (restaurant, pickup distance, drop-off area, earnings, accept or decline), "Delivery already taken" message, Pickup screen with Open in Google Maps, Drop-off details (customer first name, landmark, instructions, call button), delivery code entry, Customer unreachable report, and Earnings by day, week and month, with Dwennimmen rider recognition.
```

### Flow 7 — Admin and super admin (desktop)

```
Design the admin dashboard: Overview (today's orders, revenue, active orders by status, online riders, pending approvals, alerts for unassigned orders and payment problems), charts with a date range picker, the approvals queue for restaurants and riders with document review and reject-with-reason, Order management (search, filters, timeline, reassign rider, cancel with refund choice), Payments and refunds with flagged items, the Audit log, and super admin Platform settings (delivery fee formula, timeouts, payment methods) where every change requires a confirmation.
```

### Flow 8 — Public landing page (guests, desktop and mobile)

```
Design the public landing page that guests see before logging in. It has two jobs: get customers ordering quickly, and recruit restaurants and riders. Sections, in order:
1. Header: CibusHub logo, Log in, Sign up.
2. Hero: a specific headline about ordering from Kumasi kitchens to your exact location (not generic copy), a delivery location input with "Use my current location", and a primary "Find food near me" button that leads straight into browsing. One large dish photo placeholder as the visual centrepiece.
3. Popular near you: a short row of real-looking fictional restaurants and dishes that guests can open without an account.
4. How it works: three genuine steps (choose food, pay with mobile money or card, track your rider live).
5. Paying is safe: mobile money and card through Paystack, shown plainly, with no invented trust badges.
6. For restaurants: "Cook with CibusHub" with a short benefit list and a "Register your restaurant" button.
7. For riders: "Ride with CibusHub" with requirements (Ghana Card, licence for motorised vehicles) and a "Become a rider" button.
8. Our story: what CibusHub means and where Gye Nyame belongs in the brand story, as a placeholder I will write.
9. FAQ: delivery areas, delivery fees, payment methods, refunds, how to contact support.
10. Footer: links, contact, social placeholders.
Rules: no invented statistics, no fake testimonials, no customer counts. Keep it fast on slow mobile data: no autoplay video, one optimised hero image, no scroll animations. Include page title, meta description and a sharing preview (title, description, image) for links shared on WhatsApp. Show the mobile (360px) and desktop (1280px) versions.
```

---

## 3. Tips for Good Results

- **Review each flow before sending the next.** Check it against the Design Guide and the Avoid the AI Look file, and correct it immediately. If the first flow drifts, every later flow copies the drift.
- **Fix with specific requests.** "Make it better" produces nothing useful. "The gold text on cream fails contrast; use Cocoa on a gold fill" does.
- **The result is a starting point.** You still build the real components yourself in Steps 6 and 7. Make sure you can explain every layout decision you keep.

---

*CibusHub — companion to the Design Guide, Build Plan and Acceptance Criteria v1.0*
