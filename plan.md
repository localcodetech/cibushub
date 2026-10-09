# CibusHub — Build Plan

**Aligned to the CibusHub Acceptance Criteria v1.0**
Food Ordering & Delivery System · Restaurants, menus, orders, riders, tracking

| | |
|---|---|
| **Stack** | React · Express.js 5 · Sequelize · MySQL, with Redis, BullMQ, Socket.IO, Paystack, Nalo Solutions (SMS), Resend/SendGrid, Google Maps and Cloudinary |
| **Environment** | Ubuntu · Docker Desktop · Node 24 LTS · JavaScript (ES Modules) · npm |
| **Source of truth** | CibusHub Acceptance Criteria v1.0. Every step names the criteria it must satisfy, by ID. |
| **Working model** | You build, step by step; your senior advisor reviews each step like a pull request before you move on. |

---

## Table of Contents

1. [How to Use This Plan](#1-how-to-use-this-plan)
2. [Roadmap at a Glance](#2-roadmap-at-a-glance)
3. [Project Decisions and Conventions](#3-project-decisions-and-conventions)
   - [Step 1 — Workspace Foundation](#step-1--workspace-foundation)
   - [Step 2 — Backend Architecture](#step-2--backend-architecture)
   - [Step 3 — Database and Redis](#step-3--database-and-redis)
   - [Step 4 — Authentication and Role-Based Access](#step-4--authentication-and-role-based-access)
   - [Step 5 — Restaurants and Menus (Backend)](#step-5--restaurants-and-menus-backend)
   - [Step 6 — Frontend Foundation](#step-6--frontend-foundation)
   - [Step 7 — Customer Browsing, Addresses and Cart](#step-7--customer-browsing-addresses-and-cart)
   - [Step 8 — Checkout and the Order Engine](#step-8--checkout-and-the-order-engine)
   - [Step 9 — Payments, Cancellations and Refunds](#step-9--payments-cancellations-and-refunds)
   - [Step 10 — Restaurant Dashboard and Real-Time Updates](#step-10--restaurant-dashboard-and-real-time-updates)
   - [Step 11 — Riders, Assignment and Delivery](#step-11--riders-assignment-and-delivery)
   - [Step 12 — Notifications](#step-12--notifications)
   - [Step 13 — Reviews, Admin, Super Admin and Analytics](#step-13--reviews-admin-super-admin-and-analytics)
   - [Step 14 — Hardening and Quality](#step-14--hardening-and-quality)
   - [Step 15 — Production, Monitoring and Delivery](#step-15--production-monitoring-and-delivery)
4. [Acceptance Criteria Coverage Matrix](#4-acceptance-criteria-coverage-matrix)
5. [Working Rules](#5-working-rules)

---

## 1. How to Use This Plan

The plan breaks CibusHub into 15 steps. Each step is a vertical slice that ends in something you can run, test and show. Steps are ordered so that every step only depends on steps before it.

Each step contains:

- **Goal**: what exists when the step is finished.
- **Acceptance criteria covered**: the exact IDs from the Acceptance Criteria document. A step is not done until its **[MUST]** criteria pass. A **[SHOULD]** may only be skipped with a written reason in `docs/`.
- **Build**: the work, in a sensible order.
- **Advisor tips**: pitfalls and lessons that save time.
- **Done when**: checks you perform yourself before asking for review.
- **Send for review**: what to share so the step can be reviewed.

**Status legend**

| Status | Meaning |
|---|---|
| ✅ DONE | Built, reviewed and merged to main |
| 🟢 IN PROGRESS | Currently being built |
| 🔵 NEXT | Starts once the current step passes review |
| ⚪ PLANNED | Later; details may be refined as earlier steps teach us more |

---

## 2. Roadmap at a Glance

| Step | Title | Main acceptance criteria | Status |
|---|---|---|---|
| 1 | **Workspace Foundation** | AC-OPS-01, AC-SEC-09, AC-OPS-07, AC-DLV-01 | ✅ DONE |
| 2 | **Backend Architecture** | AC-GLOBAL-01, AC-GLOBAL-02, AC-GLOBAL-05, AC-API-01, AC-API-05 … | ✅ DONE |
| 3 | **Database and Redis** | AC-OPS-01, AC-API-05, AC-DB-01, AC-DB-03, AC-DB-07 … | ✅ DONE |
| 4 | **Authentication and Role-Based Access** | AC-AUTH-01 to 20, AC-RBAC-01 to 06, AC-RBAC-09, AC-GLOBAL-03, AC-SEC-03 … | ✅ DONE |
| 5 | **Restaurants and Menus (Backend)** | AC-REST-01 to 08, AC-MENU-01 to 10, AC-DISC-01, 02, 04, 05, 07, 08, 10, AC-IMG-01 to 04, AC-ADM-03 … | ✅ DONE |
| 6 | **Frontend Foundation** | AC-RBAC-07, 08, AC-AUTH-03, 14, 16, AC-GLOBAL-05, AC-UX-01 to 05, AC-UX-09, 12 … | ✅ DONE |
| 7 | **Customer Browsing, Addresses and Cart** | AC-CUST-01 to 08, 11, AC-DISC-01 to 10, AC-CART-01 to 08, AC-MAP-01, 02, 04, AC-IMG-05 … | ✅ DONE |
| 8 | **Checkout and the Order Engine** | AC-CHK-01 to 12, AC-ORD-01 to 07, AC-CUST-09, 10, AC-MAP-06 | 🟢 IN PROGRESS |
| 9 | **Payments, Cancellations and Refunds** | AC-PAY-01 to 16, AC-CANC-01 to 07, AC-JOB-01, 03, 04, AC-JOB-02, AC-OPS-06 | 🟢 IN PROGRESS |
| 10 | **Restaurant Dashboard and Real-Time Updates** | AC-RORD-01 to 07, AC-RT-01, 02, 03, 07, 08, AC-RT-10, AC-JOB-02, AC-UX-06, 07 | ⚪ PLANNED |
| 11 | **Riders, Assignment and Delivery** | AC-RIDER-01 to 07, AC-ASSIGN-01 to 08, AC-DEL-01 to 08, AC-RT-04, 05, 06, 09, AC-MAP-01, 03, 05 … | ⚪ PLANNED |
| 12 | **Notifications** | AC-NOTIF-01 to 09, AC-PAY-15, AC-MON-04 | ⚪ PLANNED |
| 13 | **Reviews, Admin, Super Admin and Analytics** | AC-REV-01 to 08, AC-ADM-01 to 09, AC-SADM-01 to 04, AC-ANL-01 to 06, AC-JOB-02, 05 | ⚪ PLANNED |
| 14 | **Hardening and Quality** | AC-TEST-01 to 05, 07, AC-SEC-06, 11, 13, AC-PERF-01, 02, 05, 07, AC-UX-08, 10, 11, AC-API-03, 04 … | ⚪ PLANNED |
| 15 | **Production, Monitoring and Delivery** | AC-OPS-03 to 06, AC-TEST-06, AC-SEC-10, AC-DB-06, AC-MON-01, 03, 06 … | ⚪ PLANNED |

> Testing, Swagger documentation and ER diagram updates are not a final phase: they start in Steps 3–4 and grow with every step after that.

---

## 3. Project Decisions and Conventions

These decisions apply to every step. Changing one later is expensive, so treat them as fixed unless reviewed together.

| Area | Decision |
|---|---|
| Language | JavaScript with ES Modules in both apps (decided in Step 1) |
| Package manager | npm only; lock files committed; packages installed inside containers |
| Runtime | Node 24 LTS, pinned in `.nvmrc`, `engines` and the Docker base image (Debian slim) |
| Environment | Everything runs in Docker Compose; host Node is for editor tooling only |
| Express | Express 5. Async errors reach the error handler automatically; stricter path syntax |
| API paths | Business endpoints under `/api/v1` (AC-API-01). Health check at `/api/health` exactly as AC-API-05 states; it is an infrastructure endpoint, so it is not versioned |
| Response shapes | Success and error envelopes from AC-GLOBAL-01 and AC-GLOBAL-02, used by every endpoint |
| Money | Integer pesewas everywhere; formatted as GHS X.XX only in the UI (AC-GLOBAL-08) |
| Time | Stored in UTC; displayed and evaluated (opening hours) in Africa/Accra |
| Phone numbers | Stored in E.164 (+233…) (AC-AUTH-04) |
| Auth tokens | HttpOnly cookies only; never localStorage or sessionStorage (AC-AUTH-11) |
| Client env vars | Only `VITE_`-prefixed values reach React, and they are public. API address variable: `VITE_API_URL` recommended; one name, used consistently |
| Database | Migrations only, utf8mb4, soft deletes where AC-GLOBAL-06 applies |
| Restaurant data | Fictional seed data for development and demo; real restaurants only with permission, through the onboarding flow |

### Docker workflow rules learned in Step 1

- Install packages inside the container: `docker compose exec <service> npm install <pkg>`.
- After adding or removing a package: `docker compose up --build --renew-anon-volumes`.
- Source changes need no rebuild; bind mounts and watch mode handle them.
- The browser reaches services through `localhost` and published ports; containers reach each other by service name.
- Check compose changes with `docker compose config` before starting.
- Never run `docker compose down -v` unless you intend to delete data.

---

## Step 1 — Workspace Foundation

**Status:** ✅ DONE

> **Goal.** One **cibushub** repository with independent **client** and **server** apps, running together in Docker with live reload. No features yet.
>
> **Prerequisite.** Ubuntu, Docker Desktop running, VS Code with EditorConfig, Node 24 on the host (editor tooling only).

### Acceptance criteria covered

| Criteria | What it means in this step |
|---|---|
| `AC-OPS-01` | Partial: client and server only. MySQL and Redis join in Step 3. |
| `AC-SEC-09` | Partial: .env ignored, .env.example committed. |
| `AC-OPS-07` | Git workflow begins: small, clear commits. |
| `AC-DLV-01` | Repository structure with /client and /server. |

### ✅ Already completed

- [x] Root folder, single Git repository, .gitignore, .editorconfig, .nvmrc, docs/
- [x] Client scaffolded with Vite (React, JavaScript); Vite configured for 0.0.0.0, port 5173, strictPort
- [x] Server package.json (ES Modules, engines, dev script with node --watch)
- [x] Dockerfiles for client and server, including the node_modules ownership fix
- [x] .dockerignore files, compose.yaml with bind mounts, anonymous node_modules volumes and init
- [x] First run successful; client hot reload confirmed; Express 5 installed inside the container; file ownership verified (UID 1000)

### Build (remaining)

1. Finish the smoke test: the server listens on PORT and 0.0.0.0, handles the Express 5 listen error, and returns a small JSON response at `/`.
2. Decide and record the client variable name (`VITE_API_URL` recommended) and use it consistently.
3. Write the README: prerequisites, copying .env.example files, the run command, URLs, and the package workflow (exec install, then `up --build --renew-anon-volumes`).
4. Commit in small steps and push to a **private** GitHub repository.

### Advisor tips

- Express 5 is installed. Many tutorials are for Express 4; check the version of every guide you follow.
- Start Docker Desktop before any docker command; enable auto-start in its settings.
- Never run `docker compose down -v` casually; from Step 3 it deletes your database.
- The src/index.js file is a temporary smoke test. Step 2 replaces it with a proper structure.

### ❓ Open questions for you

- Confirm: GitHub account and how you authenticate (SSH, HTTPS token or gh CLI)
- Confirm: whether MySQL is installed directly on Ubuntu (port 3306 conflict in Step 3)
- Confirm: your project deadline, so the plan can be paced

### Done when

- [ ] `docker compose up` starts both apps with no errors
- [ ] http://localhost:5173 shows the client; editing App.jsx updates the browser automatically
- [ ] http://localhost:5000 returns JSON; editing a server file restarts it automatically
- [ ] `git status` is clean: no node_modules, no .env files
- [ ] At least five meaningful commits, pushed to a private GitHub repository

### Send for review

- Folder tree (without node_modules and .git)
- compose.yaml, both Dockerfiles, both .dockerignore
- Both package.json files, vite.config.js, server/src/index.js, README.md
- Output of `docker compose ps` and `git log --oneline`

---

## Step 2 — Backend Architecture

**Status:** ✅ DONE

> **Goal.** Turn the single smoke-test file into a layered Express architecture that can carry the whole system, with one consistent way of handling configuration, errors, responses and logging.
>
> **Prerequisite.** Step 1 passed review.

### Acceptance criteria covered

| Criteria | What it means in this step |
|---|---|
| `AC-GLOBAL-01` | Consistent error format, no stack traces in production |
| `AC-GLOBAL-02` | Consistent success format with data and meta |
| `AC-GLOBAL-05` | API part: unknown routes return 404 NOT_FOUND |
| `AC-API-01` | REST conventions, versioned under /api/v1 |
| `AC-API-05` | Partial: GET /api/health with version and uptime (dependencies added in Step 3) |
| `AC-SEC-01` | Helmet security headers |
| `AC-SEC-02` | CORS: only the client origin, with credentials |
| `AC-SEC-09` | App refuses to start when a required variable is missing |
| `AC-SEC-12` | JSON body size limit |
| `AC-MON-02` | Structured logging (Pino) with a request ID |
| `AC-OPS-02` | Development, test and production configuration separated |
| `AC-OPS-08` | Graceful shutdown on SIGTERM |
| `DoD 35.1` | ESLint and Prettier for both apps |

### Build

1. Separate the **app** (Express setup, middleware, routes) from the **server bootstrap** (listen, shutdown). Tests in Step 4 import the app without opening a port.
2. Create the layers: config, routes, controllers, services, models, middlewares, validators, utils (jobs and sockets come later). Each layer has one responsibility; controllers never contain business logic.
3. Config module: validate every environment variable with Zod at startup; export one typed config object; never read process.env anywhere else.
4. Global middleware in a deliberate order: request ID, logger, Helmet, CORS, body parsers with limits, routes, 404 handler, error handler.
5. Error handling: one custom application error class (status, code, message, details), one 404 handler and one central error handler that produces the AC-GLOBAL-01 shape.
6. Response helpers so every success follows AC-GLOBAL-02.
7. Mount business routes under `/api/v1`; health at `/api/health` exactly as AC-API-05 states.
8. Graceful shutdown: on SIGTERM and SIGINT stop accepting requests, finish in-flight ones, then exit.
9. ESLint and Prettier in both apps, with npm scripts for lint and format.

### Advisor tips

- Express 5 forwards errors thrown in async handlers to the error handler automatically; you do not need wrapper packages.
- Express 5 path syntax is stricter than Express 4; avoid bare wildcards copied from old tutorials.
- Decide the error codes vocabulary now (VALIDATION_ERROR, NOT_FOUND, UNAUTHENTICATED, FORBIDDEN, CONFLICT, RATE_LIMITED, INTERNAL_ERROR) and document it in docs/.
- Log as JSON in production and pretty in development; never log passwords, tokens, OTPs or full phone numbers.
- Write one short architecture decision record (ADR) in docs/ explaining the layer structure (AC-DLV-03).

### Done when

- [ ] GET /api/health returns 200 with status, version and uptime
- [ ] An unknown route returns 404 with code NOT_FOUND in the AC-GLOBAL-01 shape
- [ ] A deliberately thrown error returns 500 INTERNAL_ERROR with no stack trace when NODE_ENV=production
- [ ] Removing PORT from .env stops the server at startup with a clear message
- [ ] Response headers show Helmet's security headers; a request from another origin is refused by CORS
- [ ] Every log line for one request shares the same request ID
- [ ] `docker compose down` stops the server cleanly, without the 10-second force kill
- [ ] Lint and format scripts pass with no warnings in both apps

### Send for review

- Server folder tree
- App file, bootstrap file, config module, error class, error and 404 handlers
- Sample responses: health, 404, forced error
- Startup log with a missing variable

---

## Step 3 — Database and Redis

**Status:** ✅ DONE

> **Goal.** Add MySQL and Redis to the Docker environment, connect Sequelize, and establish migrations, seeders and data conventions that every later step relies on.
>
> **Prerequisite.** Step 2 passed review. Confirm whether MySQL is installed on the host.

### Acceptance criteria covered

| Criteria | What it means in this step |
|---|---|
| `AC-OPS-01` | Complete: compose starts MySQL, Redis, API and client |
| `AC-API-05` | Complete: health reports MySQL and Redis; 503 if either is down |
| `AC-DB-01` | Migrations only; never sync() |
| `AC-DB-03` | Constraints enforced in the database |
| `AC-DB-07` | utf8mb4 character set |
| `AC-GLOBAL-06` | Soft deletes (paranoid) where required |
| `AC-GLOBAL-07` | createdAt, updatedAt, deletedAt |
| `AC-GLOBAL-08` | Money stored as integer pesewas |
| `AC-SADM-05` | Super admin created by a seeder from environment variables |
| `AC-DB-02` | Partial: super admin seeder |
| `AC-DB-05` | ER diagram started in docs/ |
| `AC-SEC-05` | No raw SQL built from user input |

### Build

1. Add MySQL and Redis services to compose.yaml with health checks; the server waits until both are healthy.
2. Store MySQL data in a **named** volume so it survives restarts.
3. If host MySQL uses port 3306, do not publish the container's port, or map it to another host port.
4. Install Sequelize, mysql2 and sequelize-cli. The CLI expects CommonJS: give its configuration files a .cjs extension inside the ES Modules project.
5. Database conventions: utf8mb4, UTC timezone, snake_case or camelCase chosen once and documented, integer pesewas for money, ENUMs for fixed statuses.
6. First migrations and models: User (with role and status) and Address.
7. Seeder for the super admin, reading credentials from environment variables.
8. Redis client module, reused everywhere; health check pings both MySQL and Redis.
9. Start the ER diagram in docs/ and update it with every new table.

### Advisor tips

- Service names work between containers: the server connects to the host name `mysql`, not localhost. Your browser still uses localhost.
- Never use sync({ force: true }); it drops tables. Migrations are your history.
- Write a down() for every migration and test that it reverses cleanly.
- Add a separate test database now; Step 4 tests must never touch development data.

### Done when

- [ ] `docker compose up` starts four healthy services
- [ ] Migrations run on an empty database and undo cleanly
- [ ] The super admin seeder works and is idempotent (running it twice does not duplicate)
- [ ] Data survives `docker compose down` and `up`
- [ ] Health returns 503 when Redis is stopped and 200 when it returns
- [ ] A table storing text accepts emoji and accented names correctly

### Send for review

- compose.yaml
- Sequelize configuration files
- Migrations and models
- Seeder
- Health output with all services up and with Redis down
- ER diagram draft

---

## Step 4 — Authentication and Role-Based Access

**Status:** ✅ DONE

> **Goal.** Secure registration, verification, login, sessions and permissions for all five roles, proven by automated tests.
>
> **Prerequisite.** Step 3 passed review.

### Acceptance criteria covered

| Criteria | What it means in this step |
|---|---|
| `AC-AUTH-01 to 20` | Registration, OTP, login, sessions, refresh, logout, suspension, password reset |
| `AC-RBAC-01 to 06` | Authentication, role checks, middleware order, ownership checks |
| `AC-RBAC-09` | Permission matrix documented in docs/ |
| `AC-GLOBAL-03` | Zod validation on every write |
| `AC-SEC-03` | CSRF protection for cookie authentication |
| `AC-SEC-04` | Redis-backed rate limits, stricter on auth routes |
| `AC-SEC-07` | Mass-assignment protection with strict schemas |
| `AC-SEC-08` | Sensitive fields excluded from responses and logs |
| `AC-TEST-01, 02, 04` | Testing begins: unit and Supertest integration, external services mocked |
| `AC-API-02` | Swagger documentation begins and grows with every endpoint |

### Build

1. Registration for CUSTOMER, RESTAURANT_OWNER and RIDER only; phone numbers normalised to +233 E.164.
2. Password hashing with Argon2 (or bcrypt); policy enforced by the same Zod schema idea on client and server.
3. OTP: secure 6-digit generator, hashed in Redis with a 5-minute TTL, 5 attempts, resend throttling. In development, an SMS provider stub logs a masked notice instead of sending.
4. Login with email or phone; access token (15 minutes) and refresh token (7 days) in HttpOnly, Secure, SameSite cookies; refresh rotation with reuse detection; logout revokes server-side.
5. Password reset with a generic response, 15-minute token, and session revocation.
6. Middleware: authenticate, authorize(roles), and a reusable ownership guard used by services.
7. Test setup: Vitest and Supertest against the test database.
8. Swagger/OpenAPI served at /api/docs; document each auth endpoint as you build it.

### Advisor tips

- Write the IDOR tests (customer A versus customer B) now; they become AC-SEC-13 later.
- Generic messages protect users: never reveal whether an email or phone exists.
- Keep an SMS provider interface so Nalo Solutions can be plugged in at Step 12 without touching auth logic.
- Cookies with Secure require HTTPS; make the Secure flag depend on the environment for local development.

### Done when

- [ ] Every [MUST] in AC-AUTH and AC-RBAC-01 to 06 is demonstrated by a passing test
- [ ] Passwords, hashes, tokens and OTPs never appear in responses or logs
- [ ] Six failed logins trigger a 429
- [ ] A role field in the registration body cannot create an admin
- [ ] The permission matrix in docs/ matches the implemented middleware

### Send for review

- Auth routes, controllers, services, middleware
- Test output
- Permission matrix
- Swagger screenshot of the auth section

---

## Step 5 — Restaurants and Menus (Backend)

**Status:** ✅ DONE

> **Goal.** Restaurants can onboard, be approved by admins, and manage menus; the public can browse and search approved restaurants.
>
> **Prerequisite.** Step 4 passed review.

### Acceptance criteria covered

| Criteria | What it means in this step |
|---|---|
| `AC-REST-01 to 08` | Onboarding, approval, profile, hours, accepting-orders toggle, delivery settings |
| `AC-MENU-01 to 10` | Categories, items, price validation, availability, options, stock, soft deletes |
| `AC-DISC-01, 02, 04, 05, 07, 08, 10` | Public listing, visibility rules, open status, FULLTEXT search, filters, sorting, detail |
| `AC-IMG-01 to 04` | Upload validation, optimisation, private documents, cleanup |
| `AC-ADM-03` | Partial: approve, reject, suspend endpoints |
| `AC-GLOBAL-04` | Pagination on every list |
| `AC-PERF-03` | Indexes including FULLTEXT |
| `AC-PERF-04` | Partial: cache public menus with invalidation |
| `AC-DB-02, 04` | Ghanaian seed data; associations defined |

### Build

1. Restaurant model with status lifecycle (PENDING_APPROVAL, APPROVED, REJECTED, SUSPENDED), coordinates, opening hours per day (including hours past midnight), delivery radius, minimum order, preparation time.
2. Admin approval endpoints with mandatory rejection reason.
3. Menu: categories with display order, items with integer pesewa prices, availability, tags, option groups with min/max rules and option prices.
4. Uploads: validate type by magic bytes and size, process with Sharp, store on Cloudinary; verification documents stored as private assets.
5. Public endpoints: list (pagination, filters, sorting), detail with grouped menu, FULLTEXT search.
6. Seed fictional restaurants across Kumasi neighbourhoods with local dishes, including deliberate edge cases (closed, pending, sold-out items, option groups).

### Advisor tips

- Open/closed logic must use Africa/Accra time; write unit tests for midnight-crossing hours.
- Ownership: every owner endpoint resolves the restaurant through the logged-in owner, never trusting an ID alone.
- Use free images (Unsplash, Pexels) for seed data; never copy menus or photos from real platforms.

### Done when

- [x] Pending, rejected and suspended restaurants never appear publicly and return 404 by URL
- [x] A search for a seeded dish returns matching restaurants quickly
- [x] Owner A cannot modify owner B's restaurant or menu (test)
- [x] Zero, negative and decimal prices are rejected
- [x] A deleted item still renders correctly where referenced historically

### Send for review

- Models, migrations and associations
- Endpoints in Swagger
- Seed data summary
- Test output

---

## Step 6 — Frontend Foundation

**Status:** ✅ DONE

> **Goal.** A professional React foundation: design system, routing per role, data fetching, authentication screens and guards, with every screen handling loading, empty and error states.
>
> **Prerequisite.** Steps 2 to 4 passed review (the API the frontend depends on exists).

### Acceptance criteria covered

| Criteria | What it means in this step |
|---|---|
| `AC-RBAC-07, 08` | Route guards and role-appropriate navigation |
| `AC-AUTH-03, 14, 16` | Client validation, silent token refresh, logout clears state |
| `AC-GLOBAL-05` | Frontend part: styled 404 page |
| `AC-UX-01 to 05` | Mobile-first, loading, empty, error states, form UX |
| `AC-UX-09, 12` | Respectful motion; consistent design system |
| `AC-PERF-06` | Route-level code splitting per role |

### Build

1. Install and configure Tailwind CSS, shadcn/ui, Lucide icons and Framer Motion; define CibusHub colours, typography and spacing once.
2. React Router with separate layouts for guest, customer, restaurant owner, rider and admin; lazy-load each area.
   - *Decision (2026-10-09):* Step 6 ships one shared layout plus lazy-loaded role areas behind `RequireRole`. Each role's own layout (e.g. sidebar for owner/admin, bottom bar for customer/rider) is built with that area: Step 7 customer, Step 10 owner, Step 11 rider, Step 13 admin, because the dashboards are placeholders until then.
3. API client that sends cookies with every request; TanStack Query for server state; Zustand for client state.
4. Login, registration (per role), OTP and password reset screens using React Hook Form and Zod.
5. Silent refresh: when a request returns 401, refresh once, then retry; on failure, log out cleanly.
6. Route guards and a 403 page; global error boundary; 404 page.

### Advisor tips

- Remember: React runs in the browser, so it calls localhost on the server's published port, never the Docker service name.
- Consider Vite's dev proxy so the browser sees one origin in development; decide and document it.
- Build three reusable states early (loading skeleton, empty state, error with retry) and use them everywhere.

### Done when

- [ ] Each role logs in and lands on its own dashboard shell
- [ ] A customer visiting /admin is redirected and no admin request is sent (check the network tab)
- [ ] Refreshing the page keeps the user logged in through cookies
- [ ] Forms show inline errors and disable submit while sending
- [ ] Customer bundle does not include admin code (check the build output)

### Send for review

- Client folder tree
- Router setup, API client, auth hooks, guards
- Screenshots on a 360 px viewport

---

## Step 7 — Customer Browsing, Addresses and Cart

**Status:** ✅ DONE

> **Goal.** Customers find restaurants, save precise delivery addresses on a map, and build a reliable cart.
>
> **Prerequisite.** Steps 5 and 6 passed review.

### Acceptance criteria covered

| Criteria | What it means in this step |
|---|---|
| `AC-CUST-01 to 08, 11` | Profile, re-verification, addresses with map pin, Ghana Post GPS, default, limits, deletion |
| `AC-DISC-01 to 10` | Complete discovery UI including location sorting, debounce and empty results |
| `AC-CART-01 to 08` | Cart behaviour, single restaurant, persistence, stale detection, minimum order |
| `AC-MAP-01, 02, 04` | Maps, geocoding, restricted keys |
| `AC-IMG-05` | Placeholders and lazy loading |
| `AC-GLOBAL-08` | Currency display as GHS X.XX |

### Build

1. Home and listing pages with filters stored in the URL query string; restaurant detail with grouped menu.
2. Address management: map pin (required), current location, reverse geocoding, Ghana Post GPS format, landmark, instructions.
3. Cart store: options, quantities, same-item merging, single-restaurant dialog, persistence.
4. Cart validation endpoint on the server to detect price changes, unavailable items and closed restaurants.
5. One shared money formatter used everywhere in the UI.
6. Receipt page for paid orders with a "Download PDF" button (browser print-to-PDF, print-friendly styles) (AC-PAY-17).

### Advisor tips

- The cart is never the source of truth for prices; it only remembers choices.
- Restrict the browser Maps key by HTTP referrer from day one.
- Test on a real phone over mobile data, not only on desktop.

### Done when

- [x] Every [MUST] in AC-CUST, AC-DISC and AC-CART passes on a 360 px screen
- [x] An address cannot be saved without a pin
- [x] Changing an item's price in the database is detected at cart review

### Send for review

- Screens and components
- Cart store
- Address model and endpoints
- Short screen recording

---

## Step 8 — Checkout and the Order Engine

**Status:** 🟢 IN PROGRESS (backend done; checkout screens being built)

> **Goal.** Orders are created correctly, atomically and safely, and move only through valid states.
>
> **Prerequisite.** Step 7 passed review.

### Acceptance criteria covered

| Criteria | What it means in this step |
|---|---|
| `AC-CHK-01 to 12` | Summary, server pricing, delivery fee, range, availability, transaction, snapshots, order number, idempotency |
| `AC-ORD-01 to 07` | Statuses, allowed transitions, role rules, history, concurrency, timeline, terminal states |
| `AC-CUST-09, 10` | Order history and reorder |
| `AC-MAP-06` | Haversine fallback for fees |

### Build

1. Pricing service: recalculates every line, option and fee from the database; documented delivery fee formula.
2. Order creation in one Sequelize transaction: Order, OrderItems, OrderItemOptions, stock, first status history row.
3. Snapshots of item names, prices, options, address, coordinates and contact phone.
4. Idempotency key on order submission; human-friendly order number.
5. State machine module: allowed transitions plus who may perform each; every change writes history in the same transaction.
6. Row locking or a version column to make concurrent updates safe.

### Advisor tips

- The state machine is pure business logic: unit-test every allowed and forbidden transition.
- Write the price-tampering test before the checkout endpoint is finished.
- Store totals as integers; never multiply or divide money with floats.

### Done when

- [x] A tampered client price has no effect on the stored total (test)
- [x] A double submit creates exactly one order (test)
- [x] PAID to DELIVERED is refused with INVALID_STATUS_TRANSITION (test)
- [x] Killing the request midway leaves no partial order

### Send for review

- Pricing and order services
- State machine and its tests
- Transaction code
- Test output

---

## Step 9 — Payments, Cancellations and Refunds

**Status:** 🟢 IN PROGRESS (backend done; real test payment left)

> **Goal.** Money is handled with server-side truth: Paystack payments, verified webhooks, safe retries, expiry, reconciliation and refunds.
>
> **Prerequisite.** Step 8 passed review. Paystack account in test mode.

### Acceptance criteria covered

| Criteria | What it means in this step |
|---|---|
| `AC-PAY-01 to 16` | Initiation, mobile money, secret keys, signature, verification, mismatch, idempotency, expiry, reconciliation, receipts |
| `AC-CANC-01 to 07` | Cancellation rules and refunds |
| `AC-JOB-01, 03, 04` | BullMQ queues, idempotent jobs, failure handling |
| `AC-JOB-02` | Partial: unpaid order expiry, payment reconciliation |
| `AC-OPS-06` | Partial: webhook reachable in development through a tunnel |

### Build

1. Payment record per attempt; initialise transactions with server amount in pesewas and a unique reference.
2. Webhook route that reads the **raw body**, verifies the HMAC-SHA512 signature, then verifies the transaction with Paystack before marking anything paid.
3. Idempotent processing of duplicate events; quick 200 response; heavy work moved to BullMQ.
4. Callback page that waits for server confirmation instead of trusting the redirect.
5. Jobs: unpaid expiry (30 minutes), reconciliation (every 10 minutes), refunds through the Paystack Refund API.
6. Customer cancellation before acceptance; admin cancellation with reason and refund choice.

### Advisor tips

- The webhook route must receive the raw body; register it before the global JSON parser or with its own raw parser.
- Use cloudflared or ngrok to expose your local server to Paystack test webhooks.
- Keep the payment provider behind an interface so Flutterwave could be added without changing order logic.

### Done when

- [ ] Card and mobile money test payments mark orders PAID only after verification
- [x] Invalid signature is rejected with 401; duplicate event changes nothing (tests)
- [x] Amount mismatch is flagged and not marked paid (test)
- [x] Unpaid orders expire; refunds never exceed the amount paid

### Send for review

- Payment service, webhook route, jobs
- Webhook tests
- Screenshots of Paystack test transactions

---

## Step 10 — Restaurant Dashboard and Real-Time Updates

**Status:** ⚪ PLANNED

> **Goal.** Restaurants receive and manage orders instantly; customers watch their order progress live.
>
> **Prerequisite.** Step 9 passed review.

### Acceptance criteria covered

| Criteria | What it means in this step |
|---|---|
| `AC-RORD-01 to 07` | Alerts, kitchen view, accept or reject, auto-reject, progress, board, history |
| `AC-RT-01, 02, 03, 07, 08` | Authenticated sockets, room isolation, live status, reconnection, indicator |
| `AC-RT-10` | Socket.IO Redis adapter (COULD) |
| `AC-JOB-02` | Partial: restaurant response timeout |
| `AC-UX-06, 07` | Cache updates after mutations; confirmation dialogs |

### Build

1. Socket.IO attached to the same HTTP server; JWT from the cookie verified at handshake.
2. One room per order plus one room per restaurant; joining is authorised server-side.
3. Emit status changes from the service layer after the transaction commits, never before.
4. Restaurant board with columns by status, sound alert for new orders, accept with preparation time, reject with reason.
5. Delayed job auto-rejects and refunds unanswered PAID orders after 5 minutes.
6. Customer order timeline that updates live and resyncs through REST after reconnecting.

### Advisor tips

- Sockets carry notifications of change; REST remains the source of truth for state.
- Browsers block sound until the user interacts with the page; plan an 'enable alerts' click.

### Done when

- [ ] A paid order appears on the restaurant dashboard within 2 seconds without refresh
- [ ] A user cannot join another order's room (test)
- [ ] Disconnecting Wi-Fi and reconnecting shows the correct current status

### Send for review

- Socket setup and auth
- Restaurant order services
- Recording of two browsers updating live

---

## Step 11 — Riders, Assignment and Delivery

**Status:** ⚪ PLANNED

> **Goal.** Approved riders go online, receive fair delivery offers, and complete deliveries that customers can track live.
>
> **Prerequisite.** Step 10 passed review.

### Acceptance criteria covered

| Criteria | What it means in this step |
|---|---|
| `AC-RIDER-01 to 07` | Application, approval, online toggle, location permission, stale riders, one delivery, earnings |
| `AC-ASSIGN-01 to 08` | Trigger, candidates, sequential offers, timeouts, race-safe acceptance, fallback, manual assignment |
| `AC-DEL-01 to 08` | Navigation, pickup, geofence, drop-off details, phone privacy, delivery code, completion, failures |
| `AC-RT-04, 05, 06, 09` | Live location, throttling, storage, stop after delivery |
| `AC-MAP-01, 03, 05` | Rider and tracking maps, ETA, cost control |
| `AC-RORD-08` | Restaurant sees assigned rider |
| `AC-JOB-02` | Partial: rider offer timeout, stale rider cleanup |

### Build

1. Rider profile with documents (private), vehicle details and approval flow.
2. Online toggle that requires location permission; location updates every 5 to 10 seconds, throttled and validated on the server.
3. Latest location in Redis; history in MySQL every 30 seconds.
4. Assignment job: rank eligible riders by distance, offer one at a time for 60 seconds, skip decliners, widen radius once, alert admins.
5. Race-safe acceptance with a transaction and row lock.
6. Delivery flow: pickup, drop-off details, 4-digit delivery code, completion, failed-delivery report.
7. Customer tracking map with moving rider marker and ETA.

### Advisor tips

- Test assignment logic with seeded riders at known coordinates before using real phones.
- Browser geolocation requires HTTPS on real devices; use your tunnel for phone testing.

### Done when

- [ ] Two riders accepting at once: exactly one succeeds (test)
- [ ] Offer passes to the next rider after 60 seconds
- [ ] Customer sees the rider move on a real phone
- [ ] Delivery cannot complete without the correct code

### Send for review

- Assignment service and jobs
- Location handling
- Concurrency test
- Real-device recording

---

## Step 12 — Notifications

**Status:** ⚪ PLANNED

> **Goal.** The right people hear about the right events through email, SMS and in-app messages, reliably and once.
>
> **Prerequisite.** Step 11 passed review. Accounts with an email provider and an SMS provider.

### Acceptance criteria covered

| Criteria | What it means in this step |
|---|---|
| `AC-NOTIF-01 to 09` | Matrix, async sending, retries, no duplicates, templates, SMS rules, notification centre, log, preferences |
| `AC-PAY-15` | Email receipts |
| `AC-MON-04` | Provider outages do not break ordering |

### Build

1. Email provider adapter (Resend, SendGrid or SES) and SMS adapter (Nalo Solutions) behind interfaces.
2. Notification queue with retries and exponential backoff; deterministic job IDs.
3. Branded HTML and plain-text templates for each event in AC-NOTIF-01.
4. In-app notifications stored in MySQL and pushed by Socket.IO; unread counts and mark-as-read.
5. Notification log with masked recipients.
6. Receipt email with the receipt attached as a PDF, generated on the server (AC-PAY-17).
7. Email verification after sign-up: send a 6-digit code to the email (reuse the "changeEmail" OTP flow in `otp.service.js`), fill `users.email_verified_at` when it is entered, add a client screen after phone verification, and mark addresses the provider reports as bouncing (AC-AUTH-01 "verification link by email"). Until then only the email's format is checked; the phone is the proven contact.

### Advisor tips

- Register a sender ID (e.g. CibusHub) with your SMS provider early; approval can take time.
- Replace the development OTP stub from Step 4 with the real SMS adapter, behind an environment switch.

### Done when

- [ ] Every row of the notification matrix is triggered and verified
- [ ] Real SMS and emails arrive on your devices
- [ ] Stopping the email provider does not block placing an order

### Send for review

- Adapters, queue and templates
- Notification log sample
- Screenshots from real devices

---

## Step 13 — Reviews, Admin, Super Admin and Analytics

**Status:** ⚪ PLANNED

> **Goal.** The platform can be run: honest reviews, full administration with an audit trail, configurable settings and clear reporting.
>
> **Prerequisite.** Step 12 passed review.

### Acceptance criteria covered

| Criteria | What it means in this step |
|---|---|
| `AC-REV-01 to 08` | Eligibility, content, window, aggregates, display, replies, moderation, XSS safety |
| `AC-ADM-01 to 09` | Dashboard, users, restaurants, riders, orders, payments, audit log, confirmations, moderation |
| `AC-SADM-01 to 04` | Admin management, platform settings, live settings, last super admin protection |
| `AC-ANL-01 to 06` | Charts, operational metrics, restaurant analytics, export, accuracy, performance |
| `AC-JOB-02, 05` | Daily summary and queue dashboard (COULD) |

### Build

1. Reviews after delivery only, once per order, with aggregated ratings updated transactionally.
2. Admin screens for users, restaurants, riders, orders, payments and refunds, all with search and filters.
3. Append-only audit log written for every sensitive admin action, with before and after values.
4. Platform settings table editable only by super admins; new orders read current settings, old orders keep theirs.
5. Recharts dashboards built on aggregated SQL queries with indexes, cached briefly in Redis.

### Advisor tips

- Operational metrics come almost free from OrderStatusHistory; that is why it was built in Step 8.
- Check dashboard totals against a manual SQL sum before trusting them (AC-ANL-05).

### Done when

- [ ] Every admin action appears in the audit log
- [ ] The last super admin cannot be suspended (test)
- [ ] Dashboard totals match the underlying data for a chosen period

### Send for review

- Admin and super admin endpoints
- Audit log
- Analytics queries
- Dashboard screenshots

---

## Step 14 — Hardening and Quality

**Status:** ⚪ PLANNED

> **Goal.** Prove the system is secure, fast, accessible and correct before it goes live.
>
> **Prerequisite.** Step 13 passed review.

### Acceptance criteria covered

| Criteria | What it means in this step |
|---|---|
| `AC-TEST-01 to 05, 07` | Unit, integration, end-to-end, mocks, coverage, manual checklist |
| `AC-SEC-06, 11, 13` | XSS review, dependency audit, complete IDOR suite |
| `AC-PERF-01, 02, 05, 07` | Response times, no N+1 queries, frontend performance, load test |
| `AC-UX-08, 10, 11` | Accessibility, dark mode (COULD), PWA (COULD) |
| `AC-API-03, 04` | Docs match code; shared API collection |
| `AC-MON-05` | Redis outage behaviour |

### Build

1. Playwright test for the full golden path across all roles.
2. Complete the IDOR suite for every resource type.
3. Query review: enable SQL logging, find N+1 patterns, confirm indexes from AC-PERF-03.
4. Lighthouse on mobile: Performance at least 80, Accessibility at least 90.
5. npm audit with no high or critical findings; Dependabot enabled.
6. Manual QA checklist on Android and iOS browsers.

### Advisor tips

- Fix by priority: [MUST] failures first, then [SHOULD]; record any [SHOULD] you skip with a written reason.

### Done when

- [ ] All automated tests green
- [ ] Coverage targets met
- [ ] AC-SEC, AC-PERF and AC-UX checklists reviewed and recorded

### Send for review

- Test and coverage reports
- Lighthouse reports
- Audit output
- Completed QA checklist

---

## Step 15 — Production, Monitoring and Delivery

**Status:** ⚪ PLANNED

> **Goal.** CibusHub is live, observable, backed up and presented professionally.
>
> **Prerequisite.** Step 14 passed review.

### Acceptance criteria covered

| Criteria | What it means in this step |
|---|---|
| `AC-OPS-03 to 06` | CI pipeline, CD pipeline, live deployment, production webhook |
| `AC-TEST-06` | Tests run in CI and block merging |
| `AC-SEC-10` | HTTPS only |
| `AC-DB-06` | Automated backups and a tested restore |
| `AC-MON-01, 03, 06` | Sentry, uptime monitoring, critical alerts |
| `AC-API-02` | Swagger disabled or protected in production |
| `AC-DLV-01 to 06` | Source, README, documentation, live demo, video, test evidence |
| `Section 35.3` | Release readiness checklist |

### Build

1. Production stages in both Dockerfiles (built client served statically; server without dev tooling).
2. GitHub Actions: install, lint, format check, tests, build on every push and pull request; protected main branch.
3. Deploy client (Vercel or Netlify) and server (Render, Railway or Fly.io) with managed MySQL and Upstash Redis.
4. Run migrations as part of deployment; point the Paystack webhook to production.
5. Sentry for client and server with source maps; UptimeRobot on /api/health; daily backups and one tested restore.
6. Final documentation: README, ER diagram, permission matrix, state machine diagram, order flow diagram, ADRs, demo accounts.

### Advisor tips

- Rehearse the demo with the seeded data and record the video only after the release checklist passes.

### Done when

- [ ] Every item in the release readiness checklist (Section 35.3) is ticked

### Send for review

- Pipeline runs
- Live URLs
- Sentry test error
- Backup and restore evidence
- Final documentation

---

## 4. Acceptance Criteria Coverage Matrix

Every section of the Acceptance Criteria document is assigned to at least one step. Use this table to confirm nothing is forgotten.

| § | Acceptance criteria section | IDs | Step(s) |
|---|---|---|---|
| 2 | Global criteria | AC-GLOBAL-01 to 08 | 2, 3, 5, 6, 7 |
| 3 | Authentication & account management | AC-AUTH-01 to 20 | 4 (client side in 6) |
| 4 | Authorization & RBAC | AC-RBAC-01 to 09 | 4, 6 |
| 5 | Customer profile & addresses | AC-CUST-01 to 11 | 7, 8 |
| 6 | Restaurant discovery & search | AC-DISC-01 to 10 | 5 (API), 7 (UI) |
| 7 | Restaurant onboarding & profile | AC-REST-01 to 08 | 5 |
| 8 | Menu management | AC-MENU-01 to 10 | 5 |
| 9 | Cart | AC-CART-01 to 08 | 7 |
| 10 | Checkout & order creation | AC-CHK-01 to 12 | 8 |
| 11 | Payments | AC-PAY-01 to 16 | 9 (receipt emails in 12) |
| 12 | Order lifecycle & state machine | AC-ORD-01 to 07 | 8 |
| 13 | Restaurant order handling | AC-RORD-01 to 08 | 10, 11 |
| 14 | Rider onboarding & availability | AC-RIDER-01 to 07 | 11 |
| 15 | Rider assignment | AC-ASSIGN-01 to 08 | 11 |
| 16 | Delivery execution | AC-DEL-01 to 08 | 11 |
| 17 | Real-time tracking | AC-RT-01 to 10 | 10, 11 |
| 18 | Maps, geocoding & ETA | AC-MAP-01 to 06 | 7, 8, 11 |
| 19 | Notifications | AC-NOTIF-01 to 09 | 12 |
| 20 | Cancellations & refunds | AC-CANC-01 to 07 | 9 |
| 21 | Reviews & ratings | AC-REV-01 to 08 | 13 |
| 22 | Admin panel | AC-ADM-01 to 09 | 5 (approvals), 13 |
| 23 | Super admin | AC-SADM-01 to 05 | 3 (seeder), 13 |
| 24 | Analytics & reporting | AC-ANL-01 to 06 | 13 |
| 25 | Image & file management | AC-IMG-01 to 05 | 5, 7 |
| 26 | Background jobs & scheduling | AC-JOB-01 to 05 | 9, 10, 11, 13 |
| 27 | Security | AC-SEC-01 to 13 | 2, 3, 4, 14, 15 |
| 28 | Performance & scalability | AC-PERF-01 to 07 | 5, 6, 14 |
| 29 | Frontend UX & accessibility | AC-UX-01 to 12 | 6, 10, 14 |
| 30 | API design & documentation | AC-API-01 to 05 | 2, 3, 4, 14, 15 |
| 31 | Data integrity & database | AC-DB-01 to 07 | 3, 5, 15 |
| 32 | Testing | AC-TEST-01 to 07 | 4 onward, 14, 15 |
| 33 | DevOps, deployment & CI/CD | AC-OPS-01 to 08 | 1, 2, 3, 9, 15 |
| 34 | Monitoring & reliability | AC-MON-01 to 06 | 2, 12, 14, 15 |
| 35 | Deliverables & Definition of Done | AC-DLV-01 to 06, 35.1, 35.3 | Every step; final in 15 |

---

## 5. Working Rules

1. **One branch per step** (for example `step-02-backend-architecture`), merged into `main` only after review.
2. **Small, meaningful commits.** Reference acceptance criteria IDs in commit messages and test names (for example `feat(auth): OTP attempt limit [AC-AUTH-09]`).
3. **Do not start a step before the previous one passes review**, especially Steps 2 to 4: everything rests on them.
4. **Change one thing at a time** when fixing problems, so you always know what fixed or broke something.
5. **Never upgrade tools in the middle of a fix** (npm, Node, Docker images).
6. **Read logs before searching the internet.** Most answers are in the first error line.
7. **Verify before assuming.** Form a hypothesis, test it with a command, then fix the cause, not the symptom.
8. **Keep `docs/` alive:** ER diagram, permission matrix, state machine, decisions. Update them in the same branch as the code.

### Definition of Done (from Section 35.1)

- [ ] All [MUST] acceptance criteria for the feature pass
- [ ] Server-side Zod validation and role/ownership checks are in place
- [ ] Unit and/or integration tests written and passing
- [ ] Loading, empty and error states implemented in the UI
- [ ] Endpoint documented in Swagger
- [ ] ESLint and Prettier pass with no warnings
- [ ] Works on a mobile viewport
- [ ] Reviewed and merged into `main`
- [ ] Works in the deployed environment (from Step 15 onward)

### When you bring an issue

- What you were trying to do, and which step and criteria ID it belongs to
- What you expected to happen
- What actually happened, with the **exact** error text (paste, do not paraphrase)
- The relevant files
- What you already tried, including fixes that did not work

### When you finish a step

- Folder tree (without `node_modules` and `.git`)
- The key files listed under the step's "Send for review"
- Test output (from Step 4 onward)
- `git log --oneline` for the step's branch
- A list of any [SHOULD] criteria skipped, with reasons

---

*End of CibusHub Build Plan — aligned to Acceptance Criteria v1.0*
