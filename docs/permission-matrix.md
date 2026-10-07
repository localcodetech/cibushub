# Permission Matrix

Who can call which endpoint ([AC-RBAC-09](../CibusHub_Acceptance_Criteria.md)). This file must match the middleware on each route in `server/src/routes/`. Update it in the same commit as any route change.

## How access is checked

Protected routes run these middlewares in order ([AC-RBAC-03](../CibusHub_Acceptance_Criteria.md)):

| Step | Middleware | Fails with |
|---|---|---|
| 0. Same site? (all POST/PUT/PATCH/DELETE, in `app.js`) | `checkOrigin` | `403 FORBIDDEN` when the browser's `Origin` is not the React app or the API itself ([AC-SEC-03](../CibusHub_Acceptance_Criteria.md)) |
| 1. Who are you? | `authenticate` | `401 UNAUTHENTICATED` (no, expired or forged token) · `403 ACCOUNT_SUSPENDED` |
| 2. Is the account ready? | `requireActive` | `403 ACCOUNT_NOT_VERIFIED` · `403 ACCOUNT_PENDING_APPROVAL` |
| 3. Is the role allowed? | `authorize(...roles)` | `403 FORBIDDEN` |
| 4. Is the input valid? | `validate(schema)` | `400 VALIDATION_ERROR` |
| 5. Too many requests? | rate limiters | `429 RATE_LIMITED` |
| 6. Is it yours? | ownership check inside the service | `403 FORBIDDEN` or `404 NOT_FOUND` |

`authenticate` reads the role and status from the database on every request, so suspensions and role changes apply immediately.

## Legend

- ✅ allowed
- 🔒 allowed only for the user's own data (ownership check)
- ⏳ allowed even while `PENDING_VERIFICATION` or `PENDING_APPROVAL`
- — not allowed
- **Guest** means not logged in.

## Implemented endpoints

| Endpoint | Guest | Customer | Restaurant owner | Rider | Admin | Super admin | Middleware |
|---|---|---|---|---|---|---|---|
| `GET /api/health` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `POST /auth/register` | ✅ | — | — | — | — | — | validate, registerLimiter |
| `POST /auth/verify-phone` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | validate, otpLimiter |
| `POST /auth/resend-otp` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | validate, otpLimiter |
| `POST /auth/login` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | validate, loginIpLimiter, loginAccountLimiter |
| `POST /auth/refresh` | cookie | cookie | cookie | cookie | cookie | cookie | refresh cookie only |
| `POST /auth/logout` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `GET /auth/me` | — | 🔒⏳ | 🔒⏳ | 🔒⏳ | 🔒 | 🔒 | authenticate |
| `POST /auth/forgot-password` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | validate, otpLimiter |
| `POST /auth/reset-password` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | validate, otpLimiter |
| `POST /auth/change-password` | — | 🔒⏳ | 🔒⏳ | 🔒⏳ | 🔒 | 🔒 | authenticate, validate |
| `GET /restaurants` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | validate (query) |
| `GET /restaurants/:id` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — (404 unless approved) |
| `POST /cart/check` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | validate (read-only, no login) |
| `POST /webhooks/paystack` | Paystack only | — | — | — | — | — | valid HMAC-SHA512 signature (no login, no CSRF origin) |
| `POST /owner/restaurants` | — | — | 🔒⏳ | — | — | — | authenticate, authorize, requireVerifiedPhone, validate |
| `GET /owner/restaurants`, `GET /owner/restaurants/:id` | — | — | 🔒⏳ | — | — | — | authenticate, authorize, requireVerifiedPhone |
| `PATCH /owner/restaurants/:id` | — | — | 🔒⏳ | — | — | — | authenticate, authorize, requireVerifiedPhone, validate |
| `PUT /owner/restaurants/:id/opening-hours` | — | — | 🔒⏳ | — | — | — | authenticate, authorize, requireVerifiedPhone, validate |
| `PATCH /owner/restaurants/:id/accepting-orders` | — | — | 🔒 | — | — | — | authenticate, authorize, requireActive, validate |
| `POST /owner/restaurants/:id/resubmit` | — | — | 🔒⏳ | — | — | — | authenticate, authorize, requireVerifiedPhone |
| `PUT /owner/restaurants/:id/logo`, `/cover` | — | — | 🔒⏳ | — | — | — | authenticate, authorize, requireVerifiedPhone, upload |
| `GET /owner/restaurants/:id/documents` | — | — | 🔒⏳ | — | — | — | authenticate, authorize, requireVerifiedPhone |
| `PUT /owner/restaurants/:id/documents/:type` | — | — | 🔒⏳ | — | — | — | authenticate, authorize, requireVerifiedPhone, validate (params), upload |
| `/owner/restaurants/:id/menu/**` (all menu endpoints) | — | — | 🔒 | — | — | — | authenticate, authorize, requireActive, validate (photo: upload) |
| `GET /admin/restaurants`, `GET /admin/restaurants/:id` | — | — | — | — | ✅ | ✅ | authenticate, requireActive, authorize, validate (query) |
| `GET /admin/restaurants/:id/documents` | — | — | — | — | ✅ | ✅ | authenticate, requireActive, authorize |
| `POST /admin/restaurants/:id/approve` | — | — | — | — | ✅ | ✅ | authenticate, requireActive, authorize; audit logged |
| `POST /admin/restaurants/:id/reject`, `/suspend` | — | — | — | — | ✅ | ✅ | authenticate, requireActive, authorize, validate; audit logged |
| `POST /admin/orders/:id/cancel` | — | — | — | — | ✅ | ✅ | authenticate, requireActive, authorize, validate; refund choice; audit logged |
| `GET`, `POST /customer/addresses` | — | 🔒 | — | — | — | — | authenticate, requireActive, authorize, validate |
| `PATCH`, `DELETE /customer/addresses/:id` | — | 🔒 | — | — | — | — | authenticate, requireActive, authorize, validate |
| `POST /customer/checkout/quote` | — | 🔒 | — | — | — | — | authenticate, requireActive, authorize, validate |
| `POST /customer/orders` | — | 🔒 | — | — | — | — | authenticate, requireActive, authorize, validate (headers + body) |
| `GET /customer/orders`, `GET /customer/orders/:id` | — | 🔒 | — | — | — | — | authenticate, requireActive, authorize, validate (query) |
| `POST /customer/orders/:id/cancel` | — | 🔒 | — | — | — | — | authenticate, requireActive, authorize, validate; only before the restaurant accepts; full refund if paid |
| `POST /customer/orders/:id/payments` | — | 🔒 | — | — | — | — | authenticate, requireActive, authorize; only while PENDING_PAYMENT |
| `GET /customer/orders/:id/receipt` | — | 🔒 | — | — | — | — | authenticate, requireActive, authorize; only once paid |
| `PATCH /profile` | — | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 | authenticate, requireActive, validate |
| `PUT /profile/avatar` | — | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 | authenticate, requireActive, upload |
| `POST /profile/phone`, `/phone/confirm`, `/email`, `/email/confirm` | — | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 | authenticate, requireActive, validate, otpLimiter |

Notes:

- "Register" is guest-only in practice: an existing account gets `409 ACCOUNT_EXISTS`. Admin roles can never be registered ([AC-AUTH-06](../CibusHub_Acceptance_Criteria.md)); admins are created by a super admin.
- `/me` and `change-password` work for unverified and pending accounts on purpose, so the app can show "verify your phone" or "waiting for approval" and the user can still secure their account.
- Every feature added from Step 5 onward uses `authenticate, requireActive, authorize(...)` and gets a row here.
- Owner onboarding routes use `requireVerifiedPhone` instead of `requireActive`, so an owner still `PENDING_APPROVAL` can submit, edit and upload documents. Running the business (menu, accepting orders) needs `requireActive`.
- Another owner's restaurant, item or document returns `404 NOT_FOUND`, never `403`, so IDs cannot be probed ([AC-RBAC-04](../CibusHub_Acceptance_Criteria.md)).

## Planned (from the acceptance criteria, filled in as each step is built)

| Area | Guest | Customer | Restaurant owner | Rider | Admin | Super admin |
|---|---|---|---|---|---|---|
| Browse approved restaurants and menus | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Own addresses, cart, orders, reviews | — | 🔒 | — | — | read | read |
| Own restaurant profile, menu, incoming orders | — | — | 🔒 | — | ✅ | ✅ |
| Delivery offers, own deliveries, location | — | — | — | 🔒 | read | read |
| Approve restaurants and riders, suspend users, cancel and refund orders | — | — | — | — | ✅ | ✅ |
| Manage admin accounts, platform settings | — | — | — | — | — | ✅ |
