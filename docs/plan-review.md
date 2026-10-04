# CibusHub: Systems Review of the Build Plan

**Reviews:** `plan.md` against Acceptance Criteria v1.0
**Date:** 2026-10-04
**Purpose:** find what would break in production, what is decided too late, and which acceptance criteria have no step. The fixes are written so they can be folded into `plan.md` one step at a time.

`plan.md` remains the main plan. Where the two disagree, this document says why and proposes the change. Nothing here becomes binding until it has been discussed and copied into the plan or into an ADR.

---

## Contents

0. [Decisions locked](#0-decisions-locked)
1. [Critical correctness gaps](#1-critical-correctness-gaps)
2. [Missing domain model](#2-missing-domain-model)
3. [Compliance and Ghana-specific items](#3-compliance-and-ghana-specific-items)
4. [Acceptance criteria coverage fixes](#4-acceptance-criteria-coverage-fixes)
5. [Testing strategy](#5-testing-strategy)
6. [Observability and operations](#6-observability-and-operations)
7. [Corrections to the current repository](#7-corrections-to-the-current-repository)
8. [Revised step order and per-step patch list](#8-revised-step-order-and-per-step-patch-list)

**How to read each item:** what is wrong → how it fails in practice → the fix → which step it belongs to → which criteria it touches.

---

## 0. Decisions locked

These were decided on 2026-10-04. Each one should become a short ADR in `docs/adr/` that records the context, the decision and its consequences.

### D1. npm workspaces monorepo

- **Layout:** the repository root gets a `package.json` that declares three workspaces: `client/`, `server/` and a new `packages/shared/`.
- **Why:** AC-AUTH-03 requires the *same* password rules on client and server. The same applies to several other things:
  - phone normalisation (AC-AUTH-04)
  - the Ghana Post GPS format (AC-CUST-06)
  - the order statuses and transition map (AC-ORD-01, 02)
  - the GHS formatter (AC-GLOBAL-08)
  - the cart option rules (AC-MENU-06)

  Two copies of a rule will eventually disagree. A customer would pass client validation and then be rejected by the server.
- **What goes in `shared`:** Zod schemas, enums (roles, order, payment and refund statuses), the transition map, the money formatter, the phone normaliser and pure helpers (Haversine, rounding). Nothing that touches the database, the network or the browser.
- **Consequences:**
  - The Docker build context becomes the repository root.
  - There is one lock file at the root.
  - Each Dockerfile copies the workspace manifests before the source, so the dependency-install layer stays cached.
  - Packages are installed with the workspace flag, for example installing into the server workspace from the root.
- **When:** a new Step 1.5, before Step 2. Restructuring later means touching every import.

### D2. Modular monolith, organised by domain

- **What changes:** `plan.md` Step 2 proposes top-level layer folders (routes, controllers, services, models…). With about 15 domains, each layer folder ends up with 15+ unrelated files, and one feature is spread across seven folders.
- **Instead:**
  - Group by domain under `server/src/modules/`: auth, users, addresses, restaurants, menus, cart, orders, payments, deliveries, riders, notifications, reviews, admin, settings, analytics.
  - Inside each module keep the same layers: routes, controller, service, schemas, model, policy (ownership rules).
  - Infrastructure (config, database, Redis, logger, errors, response helpers, queues, sockets) lives in `server/src/core/`.
- **Rule:** modules talk to each other only through their service functions, never by reaching into another module's models. This keeps the code testable and makes a future service split possible.

### D3. Three processes from one codebase

| Process | Responsibility |
|---|---|
| **api** | HTTP routes and Socket.IO connections |
| **worker** | BullMQ job processors, scheduled jobs and the outbox dispatcher (see C1) |
| **migrate** | Runs pending migrations once, then exits. Used in development and on every deploy |

- **Why separate the worker:** a slow refund job or a burst of SMS jobs must never slow down checkout. Restarting the API (deploys, crashes) must also not drop timers.
- **Consequence:** the worker needs to push socket events (for example "order auto-rejected"). It does this through the Socket.IO **Redis emitter**, which publishes through Redis to every API instance. AC-RT-10 (Redis adapter) therefore stops being optional; it is **required**.
- **Compose:** add a `worker` service in Step 3 (same image, different start command) and a `migrate` service that runs once.

### D4. Same-site deployment topology

- **The problem:** `plan.md` Step 15 suggests the frontend on Vercel or Netlify and the API on Render, Railway or Fly. Those are *different sites* (for example `cibushub.vercel.app` and `cibushub.onrender.com`).
  - The API's auth cookies then count as third-party cookies.
  - Safari blocks them by default and Chrome is phasing them out.
  - Login appears to succeed, then every request is 401. The Socket.IO handshake has no cookie either.
- **The fix:**
  - Buy a domain.
  - Serve the frontend at `app.<domain>` and the API at `api.<domain>`. These are the same *site* (same registrable domain), so `SameSite=Lax` cookies are sent.
  - Caddy on the VPS terminates HTTPS automatically.
- **Development mirror:** configure the Vite dev proxy so the browser talks to one origin and `/api` and `/socket.io` are forwarded to the server container. Local behaviour then matches production, and CORS problems show up early, not on launch day.
- **When:** decide in Step 2 (CORS and cookie configuration) and wire it in Step 6. It does not belong in Step 15.

### D5. CSRF approach

Cookie authentication makes CSRF a real threat (AC-SEC-03). Use three layers:

1. `SameSite=Lax` on the auth cookies.
2. An **Origin/Referer check** on every state-changing request (POST, PUT, PATCH, DELETE) against the allowlist from config.
3. A **double-submit token:** the server sets a readable (not HttpOnly) CSRF cookie, and the client copies it into a header on every unsafe request.

The Paystack webhook is excluded, because its HMAC signature protects it instead (AC-PAY-04). Document this in the security ADR.

### D6. One source for validation, API docs and the frontend

- **What changes:** `plan.md` Step 4 starts Swagger by hand.
- **Instead:** generate the OpenAPI document *from the Zod schemas*, using `@asteasolutions/zod-to-openapi` or `zod-openapi`.
- **Result:** AC-API-03 (docs cannot drift) holds from the first endpoint, with no catch-up in Step 14. The same schemas live in `shared`, so the frontend forms validate against exactly what the API documents.

### D7. Migrations tool and database conventions

- **Tool:** `plan.md` suggests sequelize-cli with `.cjs` config. That works, but **Umzug** (the library sequelize-cli uses internally) runs migrations from plain ES-module code. It is easier to call from the `migrate` container and from test setup. Either is acceptable; record the choice in an ADR.
- **Expand/contract rule:** add a new column (expand), deploy code that uses it, and remove the old column in a later release (contract). A deploy then never breaks the version still running.
- **Database conventions:**
  - Fix the connection timezone to UTC.
  - Use the `utf8mb4` character set with a `utf8mb4_0900_ai_ci` collation (accent-insensitive search for names like "Kɔkɔɔ").
  - Choose snake_case column names once.

---

## 1. Critical correctness gaps

These are not style issues. Each one describes a situation that **will** happen in production and break a [MUST] criterion.

### C1. Work after a commit can be lost (transactional outbox)

- **Gap:** the plan says to "emit after commit" and "move heavy work to BullMQ". Those are two separate systems (MySQL and Redis) with no shared transaction.
- **Failure:** the webhook marks the order PAID and commits. The process crashes (deploy, out-of-memory) before it adds the "restaurant timeout" job and the notification job. The order sits in PAID forever, nobody is alerted, and AC-RORD-04 and AC-NOTIF-01 are broken.
- **Fix:** the **transactional outbox** pattern.
  - In the *same* database transaction as the state change, insert a row into an `outbox_events` table that describes what must happen next.
  - A dispatcher in the worker reads unprocessed rows, adds the BullMQ jobs (with deterministic job IDs, so a re-send is harmless) and marks the rows done.
  - If anything crashes, the rows are still there.
  - Low-value, fire-and-forget socket pings may still be sent after commit.
- **Step:** create the table in Step 3. Use it from Step 8 onward. **AC:** AC-RORD-04, AC-NOTIF-02, AC-NOTIF-04, AC-JOB-03, AC-PAY-07.

### C2. Delayed jobs only live in Redis

- **Gap:** the 30-minute payment expiry, the 5-minute restaurant timeout and the 60-second rider offer are all *delayed BullMQ jobs*, which exist only in Redis.
- **Failure:** Redis restarts with no persistence configured and every pending timer disappears. Unpaid orders never expire, and paid orders never auto-reject.
- **Fix, in two layers:**
  1. Run Redis with **append-only file (AOF) persistence**, flushed every second, stored in a named volume.
  2. Give **every delayed job a periodic safety-net sweeper**.
     - Example: every minute, find orders that have been PAID for more than 5 minutes and are still PAID, then act on them.
     - AC-JOB-03 says every job re-checks state before acting, so if both the delayed job and the sweeper fire, the second one does nothing.
- **Step:** Redis config in Step 3. Sweepers alongside each job in Steps 9, 10 and 11. **AC:** AC-JOB-02, AC-JOB-03, AC-PAY-11, AC-RORD-04, AC-ASSIGN-04.

### C3. BullMQ and cache eviction conflict

- **Gap:** BullMQ requires Redis to run with the **no-eviction** memory policy. A cache usually wants eviction (drop the least-used keys when memory is full).
- **Failure:** if Redis is configured for cache-style eviction, it can silently delete job data under memory pressure, and jobs vanish without errors.
- **Fix:**
  - Run one Redis with no-eviction.
  - Give **every cache key a TTL** (menus, geocoding results, analytics), so memory stays bounded.
  - Document the expected memory budget.
  - If memory becomes a problem later, split into two Redis instances: jobs (no-eviction) and cache (with eviction).
- **Step:** 3. **AC:** AC-JOB-01, AC-PERF-04.

### C4. Parallel 401 responses log users out

- **Gap:** AC-AUTH-14 (silent refresh) and AC-AUTH-15 (revoke everything if a rotated refresh token is reused) interact badly.
- **Failure:**
  - The dashboard fires three requests at once and the access token has just expired, so all three get 401.
  - Each one calls refresh with the same refresh token. The first rotates it; the second and third present the *old* token.
  - Reuse detection triggers and the user is logged out of every device. With two tabs open this happens constantly.
- **Fix:**
  - **Client:** make refresh "single-flight". The first 401 starts one refresh; every other 401 waits for that same refresh, then retries.
  - **Client:** use a `BroadcastChannel` so other tabs learn about the refresh and about logout.
  - **Server:** accept the just-rotated token for a short **grace window** (around 10 seconds), returning the same new token, before treating it as reuse.
  - **Storage:** keep refresh tokens hashed, in a table with a "family" ID, so the whole chain can be revoked at once.
- **Step:** server in 4, client in 6. **AC:** AC-AUTH-14, 15, 16.

### C5. Every user looks like the same IP behind the proxy

- **Gap:** in production, Caddy forwards requests to Express. Unless Express is told to trust the proxy, every request appears to come from the proxy's IP.
- **Failure:** the global rate limit of 100 requests per minute (AC-SEC-04) is shared by *all users*. The site locks itself out at modest traffic, and the login brute-force limit (AC-AUTH-13) blocks innocent people.
- **Fix:**
  - Set Express's "trust proxy" to exactly one hop, controlled by config. It is off in development and on in production.
  - Rate-limit login by **IP and by account identifier separately**, as AC-AUTH-13 already says ("for one account or IP").
- **Step:** 2 and 4. **AC:** AC-SEC-04, AC-AUTH-13, AC-ADM-07 (correct IPs in the audit log).

### C6. Deadlocks during concurrent checkout

- **Gap:** stock decrement (AC-MENU-07) locks rows. Two checkouts that lock the same items in a different order can deadlock.
- **Failure:** MySQL kills one transaction with a deadlock error, the customer sees a 500 and the order is lost.
- **Fix:**
  - Always lock rows **in a fixed order** (sorted by ID).
  - Wrap order transactions in a helper that **retries up to 3 times** on deadlock or lock-timeout errors.
  - Consider the READ COMMITTED isolation level for these flows to reduce gap locks, and record the choice.
- **Step:** 8. **AC:** AC-CHK-06, AC-MENU-07, AC-ORD-05.

### C7. Idempotency stored in the wrong place

- **Gap:** idempotency keys stored only in Redis.
- **Failure:** Redis is flushed (or C2 happens), the client retries, and the customer is charged for two orders.
- **Fix:**
  - Put a **database unique constraint** on (customer, idempotency key) in the orders table. The database then guarantees exactly one order; Redis is only an optional fast check.
  - If a retry hits the constraint, return the existing order, as AC-CHK-09 requires.
- **Step:** 8. **AC:** AC-CHK-09.

### C8. The refund lifecycle is half-built

- **Gap:** the plan calls Paystack's Refund API but never listens for the result.
- **Failure:** refunds stay PENDING forever, the customer is never told "refund processed" (AC-CANC-07), and admins cannot see failed refunds (AC-ADM-06). Mobile-money refunds in particular can take days, or need manual handling.
- **Fix:**
  - Handle the refund webhook events (processed and failed) with the same signature verification and idempotency as payments.
  - Add a **refund reconciliation** job, like the payment reconciliation job.
  - Tell the customer the expected timing per channel.
- **Step:** 9. **AC:** AC-CANC-04, 05, 07, AC-ADM-06.

### C9. One status column is asked to mean three things

- **Gap:** AC-ORD-01 fixes the order statuses exactly. But refunds ("partially refunded"), cash orders ("not paid yet but accepted") and failed deliveries have no status of their own.
- **Failure:** the temptation is to invent extra order statuses, which breaks AC-ORD-01, or to bury the information in free text, which breaks analytics (AC-ANL-05).
- **Fix:**
  - Keep the order status **exactly** as in AC-ORD-01.
  - Add a separate **payment status** on the order: unpaid, paid, partially refunded, refunded.
  - Add a separate **deliveries** table (see §2) for delivery facts.
- **Step:** 8 and 11. **AC:** AC-ORD-01, AC-ORD-07, AC-ANL-05, AC-PAY-13.

### C10. Phones stop sending GPS when the screen locks

- **Gap:** the rider app is a website. Mobile browsers pause or slow location tracking when the screen turns off or the rider switches apps.
- **Failure:** a rider on a delivery locks the phone and the customer's map freezes (AC-RT-04). After 5 minutes the rider is marked offline (AC-RIDER-05) in the middle of a delivery.
- **Fix:** this cannot be fully solved in a browser, so it has to be designed around and documented.
  - Use the **Screen Wake Lock API** to keep the screen on during an active delivery.
  - Make the rider app an installable **PWA** (AC-UX-11).
  - Show a clear "keep CibusHub open while delivering" banner.
  - Show customers "last updated N seconds ago" so they don't think the rider has stopped.
  - **Never auto-offline a rider who has an active delivery.** Exclude them from new offers, but flag them for an admin instead.
  - State the limitation in the README. A native app is the real long-term fix.
- **Step:** 11 (and PWA groundwork in 6). **AC:** AC-RT-04, AC-RIDER-05, AC-UX-11.

### C11. Health check causes restart loops

- **Gap:** AC-API-05 says `/api/health` returns 503 when MySQL or Redis is down. That is correct for monitoring, but if Docker's container healthcheck uses it, a short Redis hiccup marks the API unhealthy and can trigger restarts. Restarting the API does not fix Redis.
- **Fix:**
  - Keep `/api/health` exactly as specified, for UptimeRobot and humans.
  - Add `/api/health/live`, which only says "the process is running", for container healthchecks.
- **Step:** 2 and 3. **AC:** AC-API-05, AC-MON-03.

### C12. The browser's currency formatter prints the wrong symbol

- **Gap:** the built-in international currency formatter may print the cedi as "GH₵", depending on the locale and runtime. AC-GLOBAL-08 requires the exact text "GHS 45.50".
- **Fix:** a small custom formatter in `shared` that takes integer pesewas and returns "GHS X.XX". Add a unit test that covers 0, 5 pesewas, 100 pesewas and large values.
- **Step:** 1.5 (shared package). **AC:** AC-GLOBAL-08.

### C13. Fractional pesewas

- **Gap:** "base fee + per-km fee" on 3.7 km, or a 2.5% service fee, produces fractions of a pesewa. The plan says "integers everywhere" but never says how rounding happens.
- **Failure:** the checkout preview and the charged amount differ by 1 pesewa. That breaks AC-CHK-03 ("the fee shown equals the fee charged") and triggers AC-PAY-06 mismatches.
- **Fix:**
  - Store percentages as **basis points** (2.5% = 250) and distance rates as pesewas per km.
  - Do all arithmetic in integers, apply **one** rounding helper (round half up) at **one** documented point, and use that helper everywhere.
  - Write the full fee formula into an ADR, with worked examples.
- **Step:** 8. **AC:** AC-CHK-03, AC-GLOBAL-08, AC-SADM-02.

### C14. Settings change between the preview and the order

- **Gap:** AC-SADM-03 says new orders use current settings and old orders keep theirs. It doesn't cover a change that lands *during* a customer's checkout.
- **Failure:** the customer sees a GHS 10.00 delivery fee, the super admin changes the formula, and the customer is charged GHS 12.00. That violates AC-CHK-03.
- **Fix:**
  - Store a **pricing snapshot** on every order: the fee settings, commission and timeouts in force at creation.
  - The checkout preview returns a quote fingerprint. When the order is placed, the server recalculates. If the result differs from the quote, it returns 409 with a "prices changed" code, and the UI shows the new totals for the customer to confirm.
- **Step:** 8 and 13. **AC:** AC-CHK-02, 03, AC-SADM-03.

### C15. Rider assignment conflicts with the state machine

- **Gap:** AC-ASSIGN-01 lets assignment start at ACCEPTED, so riders can travel while food is cooking. But AC-ORD-03 only allows READY_FOR_PICKUP to move to RIDER_ASSIGNED.
- **Failure:** a rider accepts while the order is PREPARING. The code either breaks the state machine or makes the rider wait until the food is ready before they can even be offered the job, which wastes 10–20 minutes per order.
- **Fix:**
  - Keep the assignment in the **deliveries** table, separate from the order status. Assignment starts at ACCEPTED and the rider is recorded on the delivery.
  - The *order* moves to RIDER_ASSIGNED when both are true: it is READY_FOR_PICKUP and a rider has accepted. That happens at whichever moment comes second.
  - Document this business rule in the state-machine ADR, as AC-ASSIGN-01 asks ("according to the documented business rule").
- **Step:** 11. **AC:** AC-ASSIGN-01, AC-ORD-02, AC-ORD-03, AC-DEL-02.

### C16. Undocumented outcomes the criteria leave open

Each of these needs a written policy, in the state-machine ADR, before the code is written:

| Situation | Proposed policy |
|---|---|
| Failed delivery (AC-DEL-08): there is no "failed" status | The rider reports it, the admin is alerted, and the admin cancels with a reason and chooses the refund amount (AC-CANC-03). The delivery row keeps the failure details. |
| Cash on delivery (AC-PAY-13): it must skip PENDING_PAYMENT, but accepting requires PAID | Create COD orders directly in PAID with payment status *unpaid* and payment method *cash*. PAID then means "confirmed, awaiting restaurant". The rider's cash confirmation at delivery sets payment status to paid. |
| Scheduled orders (AC-CHK-11): there is no "scheduled" status | Payment happens up front. The order stores its scheduled time. The restaurant-timeout job and the restaurant alert are delayed until (scheduled time − preparation time). The board shows a "Scheduled" tab. |
| Duplicate account (AC-AUTH-02) versus no enumeration (AC-AUTH-12, 18) | AC-AUTH-02 requires a 409, which unavoidably reveals that the account exists. Accept it, rate-limit registration strictly, and note the trade-off in the security ADR. |

---

## 2. Missing domain model

Add these to the ER diagram as their steps arrive. The plan names Order, OrderItem, Payment, Refund and OrderStatusHistory, but not the following.

| Table | Holds | Why it is needed | Step |
|---|---|---|---|
| `deliveries` | Order, rider, delivery status, assignment and pickup and drop-off times, hashed delivery code, failure reason, cash collected | Separates delivery facts from order status (C9, C15) | 11 |
| `delivery_offers` | Delivery, rider, time offered, time responded, outcome (accepted, declined, expired, superseded) | The source of truth for "never offer the same rider again" (AC-ASSIGN-04). It also feeds average assignment time (AC-ANL-02) and gives admins proof in disputes | 11 |
| Order financial columns | Subtotal, delivery fee, service fee, discount, total, commission, restaurant net, rider fee, pricing snapshot | Rider earnings (AC-RIDER-07), restaurant revenue (AC-ANL-03) and "payouts" (mentioned in AC-RBAC-04) all need these frozen at order time | 8 |
| `refresh_tokens` | User, family ID, hashed token, parent token, revoked at, device info, IP | Rotation and reuse detection (AC-AUTH-15, C4), and "log out all devices" | 4 |
| `outbox_events` | Event type, payload, correlation ID, processed at, attempts | C1 | 3 |
| `audit_logs` | Actor, action, target, before, after, IP, time; append-only | AC-ADM-07. Create it early so Step 5's approvals are audited from day one | 5 |
| `platform_settings` | Versioned rows, effective-from time, changed by | AC-SADM-02 and 03, C14 | 8 (defaults), 13 (UI) |
| `notification_logs` | Channel, masked recipient, template, status, provider response | AC-NOTIF-08 | 12 |
| `notifications` | In-app items per user, read at | AC-NOTIF-07 | 12 |
| `promo_codes`, `promo_redemptions` | Rules, plus one row per use, with a unique constraint per user where limited | AC-CHK-12 (unique constraints stop double-use under concurrency) | 8 |
| `rider_location_history` | Rider, delivery, coordinates, time | AC-RT-06, plus the retention purge (§3) | 11 |
| `menu_item_stock`, or stock columns on the menu item | Daily quantity, remaining, reset date | AC-MENU-07, AC-CANC-06 | 5 and 8 |

**Spatial design:**

- **MySQL:** store restaurant and address coordinates as a MySQL 8 spatial point (SRID 4326) with a spatial index, and calculate distances with MySQL's spherical distance function. This serves the "sort by distance" listing (AC-DISC-03) and the delivery-radius check (AC-CHK-04).
- **Redis:** store online riders' latest positions in a **Redis geo set**, so candidate search (AC-ASSIGN-02) is a single fast radius query. Keep each rider's last-update time in a sorted set; that makes the "updated within 2 minutes" filter and the stale-rider cleanup (AC-RIDER-05) cheap.

**Order numbers (AC-CHK-08):** use the format `CH-YYMMDD-NNNN`, with the counter taken from a per-day Redis counter. A database unique constraint backs it up, with a retry in case Redis was reset.

---

## 3. Compliance and Ghana-specific items

### Data protection (Ghana Data Protection Act, 2012, Act 843)

- **Privacy notice and terms:** show them at registration and record the acceptance with a timestamp and version.
- **Data minimisation:** restaurants never see the customer's phone number or full address (AC-RORD-02). Riders see the phone number only during an active delivery (AC-DEL-05).
- **Retention:** a scheduled job deletes rider location history older than a fixed number of days (for example 30). Record the number and the reasoning in an ADR.
- **Account deletion:** follow AC-CUST-11, and document exactly which fields are anonymised.

### Sensitive identity data

- **Ghana Card numbers:** encrypt them in the application before they are stored (an authenticated encryption scheme, with the key in an environment variable). Show only a masked form, even to admins, unless the admin explicitly reveals it, and audit each reveal.
- **Verification documents:** upload them to Cloudinary as *authenticated* assets, viewable only through short-lived signed URLs generated for admins (AC-IMG-03).

### Start lead-time items now (Step 1), not when they are needed

| Item | Why it can't wait |
|---|---|
| SMS sender ID "CibusHub" with Hubtel or Arkesel | Network registration can take days to weeks (AC-NOTIF-06) |
| Domain name | Needed for D4. DNS and HTTPS setup takes time |
| Paystack account | Test mode is instant; live business verification is not |
| Google Cloud project with billing | Needed for Maps keys. Create a browser key and a server key and restrict them (AC-MAP-04) |
| Cloudinary account | Needed in Step 5 |
| Email provider plus a verified sending domain (SPF, DKIM) | Without them, receipts land in spam (AC-NOTIF-05) |

### Ghana Post GPS

There is no reliable public API for converting a GhanaPostGPS address into coordinates. Plan only the format validation (AC-CUST-06). The map pin stays the source of truth (AC-CUST-04). Say this in the README so reviewers don't expect a lookup.

---

## 4. Acceptance criteria coverage fixes

### Items with no step in `plan.md`

| Gap | Fix |
|---|---|
| AC-JOB-02 "Expired token/OTP cleanup" (daily) is not assigned anywhere | Write the job in Step 4 and schedule it once the scheduler exists (Step 9) |
| **Restaurant owner screens** (onboarding form, profile, opening hours, the accepting-orders toggle, the full menu manager) have no frontend step. Step 5 is backend only, Step 7 is the customer side and Step 10 is order handling | New **Step 7b** |
| **Rider application screen** and the **admin approval screens** for restaurants and riders arrive only in Steps 11 and 13, so nobody can approve a restaurant through the UI until late | Move a minimal approval queue into Step 7b. Step 13 then extends it |
| AC-AUTH-19 "password changed" notification and AC-CUST-02 re-verification of a new phone or email | Step 4 (with the development SMS and email stubs) |
| AC-ADM-04 live rider map depends on rider locations | State the dependency on Step 11 in Step 13 |
| AC-DISC-03 location-aware listing appears in the matrix but not in a Build list | Step 5 (API with a distance sort) and Step 7a (UI) |

### All [COULD] items, now committed

| Criterion | Where | Notes |
|---|---|---|
| AC-REST-08 multiple restaurants per owner | 5 (API), 7b (switcher UI) | Model owner → restaurants as one-to-many from the start; changing it later means a migration on every owner query |
| AC-MENU-07 stock tracking | 5 (model), 8 (decrement in the order transaction), 9 (release on cancel) | Lock rows in a fixed order (C6) |
| AC-MENU-10 bulk availability | 5 and 7b | One request, one transaction, one cache invalidation |
| AC-CUST-08 address limit | 7a | Check it inside a transaction so two quick saves can't create 11 addresses |
| AC-CUST-10 reorder | 8 | Reuses the cart validation endpoint |
| AC-CHK-11 scheduled orders | 8 (+ 10 for the board tab) | See C16 |
| AC-CHK-12 promo codes | 8 | Usage limits enforced by unique constraints and counting inside the transaction |
| AC-PAY-13 cash on delivery | 8, 9 (setting), 11 (rider confirms cash) | See C16. Cash must also be counted correctly in analytics (AC-ANL-05) |
| AC-PAY-16 provider interface | 9 | The same adapter pattern used for SMS, email, maps and storage |
| AC-NOTIF-09 preferences | 12 | Transactional messages can never be switched off |
| AC-REV-06 restaurant reply | 13 | One reply per review, enforced by a unique constraint; rendered as plain text (AC-REV-08) |
| AC-ANL-04 CSV export | 13 | Stream the rows. Building a 30-day CSV in memory can crash the API |
| AC-JOB-05 queue dashboard | 13 | Bull Board mounted behind authentication, super admin only |
| AC-UX-10 dark mode | 6 | Define light and dark colour tokens on day one; adding them later means touching every component |
| AC-UX-11 PWA | 6 (manifest, offline page), 11 (rider install flow) | Directly helps C10 |
| AC-PERF-07 load test | 14 | Run k6 against staging (§6), never production |
| AC-RT-10 Redis adapter | 10 | Now required (D3) |

---

## 5. Testing strategy

Steps 3, 4 and 14 mention tests. This section makes the approach concrete.

### Test database

- A separate `cibushub_test` database, created automatically by the MySQL container's init script.
- Migrations run once at the start of the test run.
- Tables are truncated between test files. Wrapping each test in a rolled-back transaction does **not** work here, because the concurrency tests (row locks, AC-ASSIGN-05) need real committed data from separate connections.
- Integration tests run one file at a time, or each test worker gets its own database, so tests never fight over the same rows.

### Fakes for the outside world (AC-TEST-04)

- Every external service sits behind a small interface: payments, SMS, email, maps, file storage **and the clock**.
- Tests swap in fakes. A few contract tests use an HTTP-mocking library to check that the real adapters send correct requests.
- **The clock matters:** opening hours across midnight (AC-REST-05), the 7-day review window (AC-REV-03), the 60-second offer timeout and the OTP expiry all depend on "now". An injectable clock and fake timers make them testable in milliseconds.

### Tests the criteria explicitly demand

- **Concurrency:** fire two requests at the same moment against the real MySQL and assert that exactly one succeeds.
  - Rider acceptance (AC-ASSIGN-05)
  - Order status (AC-ORD-05)
  - Stock decrement (AC-MENU-07)
  - Promo usage limit (AC-CHK-12)
- **Webhooks:** compute real HMAC signatures with a test secret. Test valid, invalid, duplicate and amount mismatch (AC-TEST-02).
- **IDOR suite:** one table-driven test file listing every resource and every role (AC-SEC-13). It starts in Step 4 and gains a row with each new resource.
- **End-to-end:** Playwright runs the golden path against the Compose stack, using the fake payment provider (AC-TEST-03).

### CI

GitHub Actions starts MySQL and Redis as job services, runs migrations, then runs lint, format check, unit, integration and build (AC-OPS-03, AC-TEST-06). Playwright runs on pull requests to `main`.

---

## 6. Observability and operations

### Tracing one action end to end

- **Correlation ID:** the request ID generated in Step 2 is copied into outbox rows, job data and socket events. Searching the logs for one ID then shows the HTTP request, the job it created and the SMS it sent.
- **Log redaction:** Pino automatically redacts passwords, tokens, OTPs, cookies, authorization headers and Ghana Card numbers (AC-SEC-08).
- **Sentry:** runs in the api, the worker and the client. Errors are tagged with the release (git commit) and the user ID, never with personal data (AC-MON-01).
- **Critical alerts (AC-MON-06):** a worker job runs every few minutes. It looks for orders stuck in one status too long, a spike in failed jobs, payment mismatches and repeated webhook failures, and alerts admins.

### Production on the VPS

- **Production Compose profile:**
  - **Caddy** provides HTTPS and redirects HTTP to HTTPS (AC-SEC-10).
  - The built client is served as static files.
  - Plus api, worker, MySQL and Redis.
- **Network exposure:** only ports 80 and 443 are open to the internet, enforced by the firewall. MySQL and Redis are **never** published.
- **Images and deploys:**
  - CI builds images and pushes them to the GitHub Container Registry.
  - Deploy steps: pull images, run the `migrate` container, restart the services (AC-OPS-04).
  - Services get a stop grace period, so in-flight requests finish (AC-OPS-08).
- **Server hygiene:** automatic security updates, SSH keys only and no root login.
- **Staging:** a staging stack on the same VPS at `staging.<domain>` with Paystack test keys. Load tests (AC-PERF-07) and demo rehearsals run here.

### Backups (AC-DB-06)

- A daily database dump is copied **off the server** (for example to Backblaze B2 or another S3-compatible bucket). Keep 7 daily, 4 weekly and 3 monthly copies.
- A restore is tested into a scratch database, with the steps written down.
- A backup that has never been restored doesn't count.

### Redis outage behaviour (AC-MON-05), decide and document now

| Feature | Behaviour when Redis is down |
|---|---|
| Rate limiting | Fails open (requests allowed) and logs a warning |
| OTP | Returns 503 with a "temporarily unavailable" code |
| Menu cache | Bypassed; reads go straight to MySQL |
| Sockets | Clients fall back to polling REST |
| Jobs | Paused; the sweepers (C2) catch up when Redis returns |

---

## 7. Corrections to the current repository

These close out Step 1 before Step 1.5 begins.

1. `compose.yaml` loads `./server/.env` and `./client/.env`. If a new developer forgets to copy the examples, Compose fails with an unclear error. Mark the env files as required and make "copy the .env.example files" the first README step (AC-OPS-01: running within 15 minutes).
2. `client/src/.env.example` was moved to `client/.env.example` (the correct location, next to `vite.config.js`). Commit the move so Git records it.
3. `plan.md`, the new Docker files and `server/package-lock.json` are untracked. Commit them. The lock file later moves to the root in Step 1.5.
4. `client/src/App.jsx` still imports three images and declares a `count` state it no longer uses. `npm run lint` fails on these.
5. `server/src/index.js` has no route yet. Step 1's "returns JSON at /" check is still open.
6. Add Compose healthchecks (using the liveness endpoint from C11) and a stop grace period.
7. After Step 1.5:
   - The build context becomes the repository root.
   - Add a root `.dockerignore`.
   - Make sure the bind mount does not hide the container's `node_modules`.

---

## 8. Revised step order and per-step patch list

### New order

| Step | Title | Change |
|---|---|---|
| 1 | Workspace Foundation | Add §7 and the lead-time accounts (§3) |
| **1.5** | **Monorepo and shared package** | **New** (D1) |
| 2 | Backend Architecture | D2, D4, C5, C11 |
| 3 | Database, Redis and Worker | D3, D7, C1–C3 |
| 4 | Authentication and RBAC | D5, D6, C4 |
| 5 | Restaurants and Menus (Backend) | Spatial design, audit log early, stock |
| 6 | Frontend Foundation | Proxy, single-flight refresh, dark tokens, PWA shell |
| **7a** | Customer Browsing, Addresses and Cart | Former Step 7 |
| **7b** | **Owner, rider onboarding and approval UI** | **New** (§4) |
| 8 | Checkout and the Order Engine | C6, C7, C9, C13, C14, C16, promo, scheduled, reorder, COD order creation |
| 9 | Payments, Cancellations and Refunds | C8, sweepers, provider interface, COD setting |
| 10 | Restaurant Dashboard and Real-Time | Redis adapter required, scheduled tab |
| 11 | Riders, Assignment and Delivery | C10, C15, deliveries and offers tables, Redis geo, COD cash confirmation |
| 12 | Notifications | Preferences, verified sending domain |
| 13 | Reviews, Admin, Super Admin and Analytics | Reply, export, Bull Board, settings UI |
| 14 | Hardening and Quality | k6 on staging |
| 15 | Production, Monitoring and Delivery | VPS stack, staging, backups off-server |

### Patch list (bullets to fold into each step of `plan.md`)

**Step 1: add**

- Build: open the accounts in §3 now (SMS sender ID, domain, Paystack, Google Cloud, Cloudinary, email domain).
- Build: apply §7 items 1–6.
- Done when: the lint script passes in the client.

**Step 1.5: Monorepo and shared package (new)**

- Goal: one install, one lock file, one shared package that both apps import.
- Build:
  - Root workspaces manifest.
  - Move the lock files to the root.
  - `packages/shared` with its own manifest and an index.
  - Move the Docker build context to the root.
  - First shared contents: roles, order statuses, the money formatter and the phone normaliser, each with unit tests.
- Done when:
  - Both apps import one constant from `shared`.
  - `docker compose up --build` still works with hot reload.
  - The GHS formatter test passes (C12).
- ADR: 001-monorepo.

**Step 2: add**

- Build: the domain-module layout (D2) in place of top-level layer folders.
- Build: trust proxy from config (C5).
- Build: CORS and cookie settings designed for `app.` and `api.` on the same site (D4).
- Build: the `/api/health/live` endpoint (C11).
- Advisor tip: the correlation ID created here must later travel into jobs (§6).
- ADRs: 002-module-structure, 003-deployment-topology, 004-error-codes.

**Step 3: rename to "Database, Redis and Worker"; add**

- Build:
  - The worker and migrate services (D3).
  - Redis with AOF persistence and the no-eviction policy (C2, C3).
  - The outbox table and dispatcher skeleton (C1).
  - The test database created by the init script (§5).
  - The chosen migration tool (D7).
  - The spatial column type decided.
- Done when: stopping and starting Redis keeps a queued test job; the worker logs that it processed an outbox row.

**Step 4: add**

- Build:
  - Refresh token families, the grace window and reuse detection (C4).
  - The CSRF layers (D5).
  - OpenAPI generated from Zod (D6).
  - The expired-token cleanup job function.
  - Password-changed notification and contact re-verification through stubs.
  - The IDOR test file started.
  - Privacy and terms acceptance stored at registration (§3).
- Done when:
  - Two concurrent refresh calls do not log the user out.
  - A cross-origin POST without the CSRF token is refused.

**Step 5: add**

- Build:
  - Spatial points and a distance sort (AC-DISC-03).
  - The audit log table, used by the approval endpoints.
  - Multiple restaurants per owner (AC-REST-08).
  - Stock fields (AC-MENU-07).
  - Bulk availability (AC-MENU-10).
  - Every cache key has a TTL (C3).
- Done when: changing a menu item clears the cached public menu within one request.

**Step 6: add**

- Build:
  - Vite proxy for `/api` and `/socket.io` (D4).
  - Single-flight refresh and tab sync (C4).
  - CSRF header on unsafe requests (D5).
  - Light and dark tokens (AC-UX-10).
  - PWA manifest and offline page (AC-UX-11).
  - Forms use the schemas from `shared`.
- Done when: opening two tabs and waiting past the access-token expiry does not log the user out.

**Step 7a (customer): add**

- Build:
  - Address limit inside a transaction (AC-CUST-08).
  - "Use my location" fallback message (AC-CUST-05).
  - README note that Ghana Post GPS is format-only.

**Step 7b: Owner, rider onboarding and approval UI (new)**

- Goal: the supply side can be demonstrated through the UI.
- Build:
  - Restaurant onboarding form with documents.
  - Profile and opening-hours editor, including hours past midnight.
  - The accepting-orders toggle.
  - Category and item manager with option groups, stock and bulk availability.
  - Restaurant switcher.
  - Rider application form.
  - Minimal admin approval queues with document viewing through signed URLs.
- Criteria: AC-REST-01 to 08, AC-MENU-01 to 10 (UI), AC-RIDER-01 and 02 (UI), AC-ADM-03 and 04 (partial), AC-IMG-01 to 05.
- Done when: a new owner can register, submit a restaurant, be approved by an admin and publish a menu without using the API directly.

**Step 8: add**

- Build:
  - Deadlock-safe locking order and retry helper (C6).
  - Idempotency unique constraint (C7).
  - Separate payment status (C9).
  - Basis points and a single rounding helper (C13).
  - Pricing snapshot and quote fingerprint (C14).
  - Order financial columns (§2).
  - Promo codes (AC-CHK-12).
  - Scheduled orders (AC-CHK-11).
  - Reorder (AC-CUST-10).
  - COD order creation per C16.
  - Default platform settings rows.
  - Outbox events written for every status change.
- ADRs: 005-order-state-machine (including C15 and C16), 006-pricing-formula.
- Done when: two simultaneous checkouts for the last unit of stock produce exactly one order.

**Step 9: add**

- Build:
  - Refund webhooks and refund reconciliation (C8).
  - A sweeper for each delayed job (C2).
  - Payment provider interface (AC-PAY-16).
  - Cash-on-delivery switch in settings.
- Done when: deleting all Redis data, then waiting one sweeper interval, still expires an old unpaid order.

**Step 10: add**

- Build:
  - Socket.IO Redis adapter, plus the emitter used by the worker (D3).
  - "Scheduled" tab on the board.
  - A sweeper for the restaurant timeout.
- Done when: an auto-reject performed by the worker reaches the customer's browser live.

**Step 11: add**

- Build:
  - Deliveries and delivery-offers tables (§2).
  - Assignment independent of order status (C15).
  - Redis geo set for online riders.
  - Wake lock, a keep-open banner, a "last updated" label and no auto-offline during a delivery (C10).
  - Rider cash confirmation (AC-PAY-13).
  - Location history retention job (§3).
- Done when: a rider accepted while the order is PREPARING appears as RIDER_ASSIGNED the moment the restaurant marks it ready.

**Step 12: add**

- Build:
  - Verified email sending domain (SPF, DKIM).
  - Notification preferences (AC-NOTIF-09).
  - Every notification job is created from the outbox (C1).

**Step 13: add**

- Build:
  - Restaurant reply (AC-REV-06).
  - Streaming CSV export (AC-ANL-04).
  - Bull Board for the super admin (AC-JOB-05).
  - Settings UI writing versioned rows (C14).
  - Live rider map (depends on Step 11).
  - Masked Ghana Card display with audited reveal.

**Step 14: add**

- Build:
  - k6 load test on staging (AC-PERF-07).
  - Redis outage drill following the table in §6 (AC-MON-05).
  - Confirm the IDOR file covers every resource added since Step 4.

**Step 15: replace the Vercel and Render suggestion with**

- Build:
  - The VPS production profile behind Caddy (D4, §6).
  - Images in GHCR.
  - Deploy job that runs the migrate container.
  - Staging stack.
  - Off-server backups with a tested restore.
  - Firewall and SSH hardening.
- Done when: the release readiness checklist (Section 35.3) passes on production, and a restore from last night's backup succeeds on staging.

### ADR list to create over the project

| ADR | Topic | Step |
|---|---|---|
| 001 | Monorepo with npm workspaces | 1.5 |
| 002 | Domain-module structure | 2 |
| 003 | Deployment topology and cookies (same site) | 2 |
| 004 | Error code vocabulary | 2 |
| 005 | Order state machine, assignment rule, COD, scheduled orders, failed delivery | 8 |
| 006 | Pricing and fee formula, rounding, basis points | 8 |
| 007 | Outbox and job reliability (sweepers) | 3 |
| 008 | Security: CSRF, refresh rotation, enumeration trade-off | 4 |
| 009 | Data protection: retention, encryption, masking | 11 |
| 010 | Redis outage behaviour | 14 |

---

*End of the systems review. Go through it one section at a time, starting with §1, and fold each agreed item into `plan.md`.*
