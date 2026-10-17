# Every package, and why it's here

What each package, tool and service in CibusHub is, **how** we use it (with a file to look at), **why** we picked it, and its **downsides** compared with the main alternative.

Think of CibusHub as a **restaurant building**. The sections below go from the ground up: the land and walls (platform), the kitchen (server), the dining room (client), the tools the builders use (dev tools), and the suppliers outside (external services).

Versions are in `server/package.json` and `client/package.json`. Install packages inside the containers (`docker compose exec server npm install <pkg>`), and run `npm audit` before releases ([dependency-audit.md](dependency-audit.md)).

---

## 1. The platform: land, walls and plumbing

### Node.js 24
**What:** the engine that runs JavaScript outside the browser, so our server is written in the same language as the app.

**How:** both apps run on it, in Docker (`server/Dockerfile`, `client/Dockerfile`, `.nvmrc`).

**Why:** one language for the whole project means less to learn, and npm has a package for almost everything.

**Downsides vs Go / Java / Python:** one main thread, so heavy number-crunching (like resizing big photos) can block other requests; we hand that work to `sharp`, which runs it outside the main thread. Go and Java use several CPU cores more naturally, and Python has stronger data tools.

### Docker and Docker Compose
**What:** shipping containers for software. Each part (API, worker, MySQL, Redis, web server) travels in its own sealed box with everything it needs, so "it works on my laptop" also means "it works on the VPS".

**How:**
- `compose.yaml` runs everything on your laptop.
- `compose.prod.yaml` runs the real site **and** the demo on one VPS.
- `deploy/deploy.sh` rebuilds and restarts.


**Why:** one command starts the whole system, and the laptop and the server run the same versions.

**Downsides vs Kubernetes / Render or Heroku:**
- No automatic spreading across several servers. Kubernetes does that, but it's far heavier to learn.
- More hands-on than Render or Heroku: we patch the VPS ourselves.

### MySQL 8.4
**What:** the filing cabinet. Every user, order and payment lives here, in tables with strict columns.

**How:** the `mysql` service. Tables are created by migrations (`server/src/database/migrations/`).

**Why:**
- **Transactions:** "take the stock, create the order, save its items" happen all together or not at all.
- **Row locks:** two riders can't accept the same delivery.
- Widely known, and cheap to host.


**Downsides vs PostgreSQL / MongoDB:**
- PostgreSQL has richer features: better JSON queries, and PostGIS for real map queries (we work out distances in code instead).
- MongoDB is easier to change shape, but it's weaker at the money-and-stock transactions an ordering app needs.

### Redis 8
**What:** the kitchen whiteboard. It's super fast and holds short-lived things, but it isn't the filing cabinet.

**How:**
- **Job queues** (BullMQ)
- **Rate limit counters**
- **Live rider positions**
- **OTP codes**
- **Settings cache**
- **Socket.IO messages** between the API and the worker

It runs with append-only saving (`--appendonly yes`), so a restart doesn't wipe the queues. Database 0 is the real site and database 1 the demo.

**Why:** answers in under a millisecond; many packages here are built on it.

**Downsides vs Memcached / RabbitMQ:**
- Memcached is a simpler cache, but it can't run queues.
- RabbitMQ is a "proper" message broker that's harder to lose messages from, but it would be one more service to run. Our every-minute sweeper jobs cover Redis losing a delayed job.

### Caddy
**What:** the front door and doorman. Every visitor comes through it; it hands out the app's files and passes `/api` and `/socket.io` on to the API.

**How:** `client/Caddyfile`, inside the `web` image.

**Why:** it gets and renews **HTTPS certificates by itself** (Let's Encrypt). The config is a few readable lines.

**Downsides vs Nginx:** Nginx is more common, so there are more tutorials and a bit more raw speed. But certificates in Nginx need extra tools (certbot) and more configuration.

---

## 2. The server (the kitchen): `server/`

### The core

**express 5**: *the head chef who reads every ticket and sends it to the right station.*
- **How:** `src/app.js` wires up every route; `src/routes/*` say which address goes to which controller.
- **Why:** the best-known Node web framework. Version 5 sends errors from `async` code to our error handler automatically.
- **Downsides vs Fastify / NestJS:** Fastify is faster and checks input built in. NestJS gives a strict structure for big teams. Express leaves the structure to us (see [ADR 001](adr/001-server-structure.md)).

**sequelize 6 + mysql2 + sequelize-cli**: *a translator between JavaScript objects and MySQL tables, plus the driver that talks to MySQL, plus the tool that runs migrations and seeders.*
- **How:** models in `src/models/`, queries only in `src/repositories/`, `npm run db:migrate`.
- **Why:** a mature system with migrations, transactions and soft deletes (`paranoid`).
- **Downsides vs Prisma / Drizzle / Knex:**
  - Prisma and Drizzle catch typos in queries before running, and their migrations are generated for you.
  - Sequelize can be wordy, and it pulls in an old `uuid` (we override it; see the audit).

**zod 4**: *the bouncer at every door. Data that doesn't match the rules doesn't get in.*
- **How:** `src/validators/*` check every request body, query and header. `src/config/env/env.schema.js` checks the settings at startup, so a missing secret stops the server instead of failing later. The client uses zod too, for its forms.
- **Why:** you write the rules once and get clear error messages. The same rules can work in the browser and on the server.
- **Downsides vs Joi / Yup / express-validator:** zod is larger than Yup (one reason we keep form pages out of the first download). Joi only works on the server.

### Security

**helmet**: *a pack of safety signs on the door* (security headers that stop browsers being tricked, e.g. into loading our pages inside another site).
- **How:** `app.use(helmet())` in `src/app.js`.
- **Downside:** some headers can break features until you adjust them. We had to loosen them for the Bull Board queue dashboard.

**cors**: *the guest list* of websites allowed to call the API with cookies.
- **How:** only `CLIENT_URL` (`src/app.js`).
- **Downside:** easy to get wrong. A `*` with cookies would be dangerous; we name one address.

**cookie-parser + cookie**: *reading the wristbands.* cookie-parser reads cookies on normal requests; `cookie` reads them on Socket.IO connections (`src/sockets/socketServer.js`).
- **Why cookies, not localStorage:** HttpOnly cookies can't be read by JavaScript, so a malicious script can't steal a login.

**express-rate-limit + rate-limit-redis**: *a turnstile that counts people.*
- **How:** `src/middlewares/rateLimit/*`:
  - 200 requests a minute per account, 100 per IP for guests
  - stricter limits for login, codes and checkout
- **Why Redis:** the counts are shared, so restarting the API doesn't reset them, and all API copies see the same numbers.
- **Downside:** a limiter is not DDoS protection. A flood from thousands of machines needs a shield in front (e.g. Cloudflare's proxy).

**bcryptjs**: *a one-way blender for passwords.* We store the smoothie, never the fruit.
- **How:** `src/utils/auth/password.js`.
- **Why:** deliberately slow, so guessing millions of passwords takes too long. Pure JavaScript, so it installs anywhere.
- **Downsides vs bcrypt (native) / argon2:** the native version is faster, and argon2 is the newer recommended method. bcryptjs is a bit slower per login but has no build problems in Docker.

**jsonwebtoken**: *the stamped wristband* that says "this is user X, valid for 15 minutes".
- **How:** `src/utils/auth/tokens.js` signs and checks our own login tokens.
- **Downside vs jose:** jose is more modern and works everywhere (including the browser). jsonwebtoken is older but simple, and fine for our own tokens.

**jose**: *a passport checker for other countries' passports.* It checks Google's and Apple's sign-in tokens against their **public keys**.
- **How:** `src/utils/auth/socialTokens.js`.
- **Why:** it downloads and caches the providers' keys (JWKS) for us.

### Files, images and documents

**multer**: *the mail room* that receives uploaded files (photos, documents) from forms.
- **How:** `src/middlewares/upload.js` keeps files in memory, with size limits.
- **Downside vs busboy or direct uploads:** files pass through our server. Uploading straight from the browser to Cloudinary would skip that, but it's harder to check files first.

**file-type**: *checks the actual contents of a file, not its name.* A virus renamed `photo.jpg` is still caught.
- **How:** `src/utils/upload/checkFileType.js`.

**sharp**: *a darkroom* that resizes and compresses photos to WebP before upload.
- **How:** `src/services/upload/cloudinary.service.js`.
- **Why:** very fast (native code), so photos load quickly on mobile data.
- **Downsides vs jimp:** sharp is native, so it needs matching binaries for the machine (Docker handles that). jimp is pure JavaScript, but much slower.

**cloudinary**: *the photo album in the cloud.* It stores and serves restaurant and dish photos, and keeps documents private.
- **How:** `src/services/upload/cloudinary.service.js`.
- **Downsides vs Amazon S3 / Cloudflare R2:** S3 and R2 are cheaper for big storage. Cloudinary adds image resizing and a CDN, but its free plan has limits.

**pdfkit**: *a printer* that draws receipt PDFs line by line.
- **How:** `src/services/order/receiptPdf.service.js`.
- **Downside vs Puppeteer (HTML to PDF):** you draw positions by hand. Puppeteer reuses web pages, but it runs a whole browser, which is heavy for a small VPS.

### Live updates and background work

**socket.io**: *the restaurant's PA system.* "Order 23 is ready!" reaches every screen at once.
- **How:** `src/sockets/socketServer.js` (rooms per user, restaurant and order); the client uses `socket.io-client`.
- **Why:** it reconnects by itself, falls back when WebSockets are blocked, has rooms, and answers back (acknowledgements).
- **Downsides vs plain WebSockets (ws) / Server-Sent Events:**
  - Larger, with its own protocol, so both ends must use Socket.IO.
  - Plain WebSockets are lighter but need reconnects and rooms built by hand.
  - SSE is one-way only, and riders must send their location back.

**@socket.io/redis-adapter + @socket.io/redis-emitter**: *walkie-talkies between kitchens.*
- The adapter lets several API copies share one PA system.
- The emitter lets the **worker** (which has no Socket.IO server) announce things, e.g. "rider found" (`src/sockets/emitter.js`).

**bullmq**: *the kitchen's ticket rail with timers:* "in 30 minutes, check if this order was paid".
- **How:** `src/jobs/*`, run by `src/worker.js`, with retries and backoff ([background-jobs.md](background-jobs.md)).
- **Downsides vs Agenda (MongoDB) / cron / a cloud queue:**
  - Needs Redis.
  - If Redis loses data, delayed jobs are lost (our sweepers cover that).
  - Cloud queues (Amazon SQS) are more durable, but they cost money and tie you to a provider.

**ioredis**: *the phone line to Redis*, used by everything above.
- **How:** `src/config/redis.js`, `src/config/queueConnection.js`.

**@bull-board/api + @bull-board/express**: *a window into the ticket rail.* Super admins see waiting, done and failed jobs at `/api/v1/super-admin/queues`.

### Watching the kitchen

**pino + pino-http** (and **pino-pretty** while developing): *the kitchen logbook.* One line per request, plus errors, written very fast.
- **How:** `src/config/logger.js`, plus `pino-http` in `src/app.js`, which gives every request a `req.log`.
- **Downside vs winston:** winston has more built-in destinations. pino is faster, and its JSON lines are easy to search.

**@sentry/node**: *the smoke alarm.* When the server or worker crashes, Sentry emails us the exact line.
- **How:** `src/config/sentry.js`, `reportError()` in the error handler and the worker. Production only, and no personal data.
- **Downsides vs self-hosted GlitchTip / plain logs:** the free plan has a monthly limit, and data goes to a third party. GlitchTip is free and self-hosted, but it's one more thing to run.

**swagger-ui-express**: *the menu card for developers.* An interactive list of every API address at `/api/docs` (off in production).
- **How:** `src/openapi/*`.

---

## 3. The client (the dining room): `client/`

### The core

**react 19 + react-dom**: *the building blocks of every screen.* Pages are made of reusable pieces (components) that redraw when data changes.
- **How:** `src/main.jsx` starts it; everything in `src/pages` and `src/components`.
- **Downsides vs Vue / Svelte / plain HTML:** React is the biggest part of our first download. Svelte ships far less code, and Vue is gentler to learn. React has the largest job market and ecosystem.

**vite 8 + @vitejs/plugin-react**: *the prep kitchen.* It serves the app instantly while you code (hot reload) and packs it into small files for production (`npm run build`).
- **How:** `vite.config.js`.
- **Downsides vs webpack / Next.js:** webpack is older and slower. Next.js adds server-side rendering, which is better for Google search on public pages. Vite stays simple.

**react-router 8**: *the signposts.* Which page shows for which address, who may see it, and lazy loading per page.
- **How:** `src/App.jsx`.
- **Downside vs TanStack Router:** TanStack checks links and parameters for typos before running (with TypeScript). React Router is the most widely used.

**@tanstack/react-query**: *a waiter with a good memory.* It fetches data from the server, remembers it, refreshes it when it's stale, retries on bad networks, and pauses while offline.
- **How:** `src/lib/queryClient.js`; used on most pages (`useQuery`, `useMutation`).
- **Downside vs SWR / Redux Toolkit Query:** SWR is smaller with fewer features; RTK Query fits apps already using Redux. React Query has the best tools and docs.

**zustand**: *a small notice board* shared across the app: who's logged in (`authStore`), the cart (`cartStore`), the live connection status (`connectionStore`).
- **How:** `src/store/*`.
- **Downside vs Redux Toolkit / React Context:** Redux has stronger structure and debugging for big teams. Context re-draws too much when values change. zustand is tiny and simple.

### Forms

**react-hook-form + @hookform/resolvers + zod**: *a form clerk* that tracks every field, checks it with the zod rules, and shows the errors.
- **How:** Sign up, Log in, Address, Menu builder… (`src/validators/*` hold the rules).
- **Downside vs Formik / plain React state:** Formik re-draws more and is less maintained. Plain state works for tiny forms but gets messy fast.

### Look and feel

**tailwindcss 4 + @tailwindcss/vite**: *paint by numbers.* Styles are short class names written right on the element (`px-4 rounded-lg bg-primary`).
- **How:** everywhere; colours and dark mode in `src/index.css`.
- **Downsides vs plain CSS / CSS Modules / styled-components:** long class lists can be hard to read, and you must learn its names. Version 4 has gotchas we hit (e.g. `transition` must name `translate,scale`).

**radix-ui + shadcn + class-variance-authority + cn**: *ready-made, accessible fittings* (menus, sheets, switches) that work with the keyboard and screen readers.
- **shadcn:** provides starter components and the `shadcn/tailwind.css` styles.
- **class-variance-authority:** button variants (`variant="outline"`).
- **cn:** merges Tailwind classes without clashes (`src/lib/utils.js`).
- **Downside vs MUI / Chakra:** those give a complete design system out of the box, but heavier and harder to make look unique. With shadcn we own the code and style it ourselves.

**tw-animate-css + motion**: *stage lighting.* Small animations (sheets sliding in, the page fade, card lifts).
- **How:** `motion` with `MotionConfig reducedMotion="user"` in `src/main.jsx`, which turns animations off for people who ask their device for less motion.
- **Downside vs plain CSS transitions:** motion adds weight to the download. CSS alone is lighter but harder for enter and exit animations.

**lucide-react**: *the icon box* (cart, bike, bell…). Only the icons we use are included.
- **Downside vs Heroicons / Font Awesome:** Font Awesome has more icons but is heavier. Heroicons has fewer.

**@fontsource-variable/schibsted-grotesk + @fontsource/atkinson-hyperlegible**: *the signage lettering.* Headings in Schibsted Grotesk; body text in Atkinson Hyperlegible, designed to be easy to read for people with low vision.
- **How:** bundled with the app, not loaded from Google Fonts, so they're faster and nothing is shared with Google.

### Maps, charts and live updates

**leaflet + react-leaflet**: *the wall map.* Drop your address pin, watch the rider move.
- **How:** address form, order tracking, admin rider map. OpenStreetMap tiles ([ADR 002](adr/002-free-maps-stack.md)).
- **Downside vs Google Maps:** free and no card needed, but OpenStreetMap data for Kumasi is less complete (a better map is on the after-launch list). Google has better addresses and real road routes, but needs billing.

**recharts**: *the charts on the wall.* Sales and ratings for owners and admins.
- **Downside vs Chart.js / ECharts:** Chart.js is lighter. ECharts is more powerful for huge data. Recharts is the most "React-like" to write.

**socket.io-client**: the dining room end of the PA system (see the server's socket.io). It's downloaded only after login (`src/lib/liveUpdates.js`).

**@sentry/browser**: the smoke alarm in the dining room. Crashes in people's browsers are reported, loaded after the app starts (`src/lib/errorReporting.js`, `src/lib/sentryClient.js`).

### Installable app

**vite-plugin-pwa + @vite-pwa/assets-generator**: *turns the website into an app you can add to the home screen*, with icons and an offline page (`public/offline.html`).
- **How:** `vite.config.js` (Workbox runs behind it).
- **Downside vs a native app (React Native / Flutter):** no app-store listing, and limited background GPS for riders. A native app can track in the background, but it's a second codebase.

---

## 4. The builders' tools (development only, never shipped)

| Tool | What it does | Where | Downside / alternative |
|---|---|---|---|
| **eslint** (+ `@eslint/js`, `globals`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `eslint-config-prettier`) | A **proofreader** that flags bugs and bad patterns, e.g. a React hook used wrongly | `eslint.config.js` in each app; `npm run lint` | Rules can be noisy. **Biome** does linting and formatting in one fast tool, but it has fewer rules |
| **prettier** | A **typesetter** that formats code the same way for everyone | `npm run format` | Opinionated, not configurable much. Biome is the faster alternative |
| **vitest** | The **taste-tester**: runs our 760+ server tests | `server/tests/*`, `npm test` | Jest is older and more common. Vitest is faster and understands ESM natively |
| **supertest** | A **pretend customer** that sends real HTTP requests to the app in tests | every API test | Testing services directly is faster but skips the routes and middlewares |
| **@types/react, @types/react-dom** | Hints for the editor's autocomplete | VS Code | Unused at runtime. We write JavaScript, not TypeScript; TypeScript would catch more mistakes before running, at the cost of more to learn |
| **GitHub Actions** | The **inspector** who checks every pull request: lint, format, build, all tests | `.github/workflows/ci.yml` | Free minutes are limited. GitLab CI and CircleCI are alternatives |

---

## 5. Outside suppliers (services, not packages)

| Service | Job in CibusHub | Where in code | Downside / alternative |
|---|---|---|---|
| **Paystack** | Takes card and Mobile Money payments, sends webhooks, refunds | `server/src/services/payment/*` | Fees per payment. **Hubtel** and **Flutterwave** are the Ghana alternatives. Paystack has the cleanest API and docs |
| **Nalo Solutions** | Sends SMS (codes, order updates), sender "CibusHub" | `services/notifications/sms.service.js` | **Hubtel SMS**, **mNotify**, Arkesel. Delivery speed varies by network |
| **Resend** | Sends email from `mail.cibushubgh.com`, reports bounces | `services/notifications/email.service.js` | **SendGrid** and **Amazon SES** (cheaper at volume). Resend is simplest to set up |
| **Cloudinary** | Photos and private documents | see above | S3 / R2 |
| **OpenStreetMap** (tiles and Nominatim search) | Maps, pin → place name | `services/maps/nominatim.client.js` | Google Maps (paid). Nominatim limits us to about 1 search a second, so we cache |
| **Google / Apple / Facebook sign-in** | "Continue with…" buttons | `utils/auth/socialTokens.js`, `client/src/components/auth/SocialSignInButtons.jsx` | Each has its own console and rules. Facebook needs business verification to go Live |
| **Cloudflare** | DNS, and Email Routing for `support@` | dashboard only | Could also proxy the site (DDoS shield, caching) |
| **Backblaze B2** + **rclone** | Off-site copy of nightly database backups | `deploy/backup.sh` | Cloudflare R2 or S3; rclone works with all of them |
| **Sentry** | Crash reports | `config/sentry.js`, `lib/errorReporting.js` | GlitchTip (self-hosted) |
| **UptimeRobot** | Checks the site every 5 minutes and alerts when it's down | dashboard only | Better Stack, Pingdom |
| **The VPS** (Ubuntu 24.04) | The building's land: one server running everything | `deploy/*` | Render or Railway (easier, pricier); AWS (more power, far more complex) |
