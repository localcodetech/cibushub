# Permission Matrix

Who can call which endpoint ([AC-RBAC-09](../CibusHub_Acceptance_Criteria.md)). This file must match the middleware on each route in `server/src/routes/`. Update it in the same commit as any route change.

## How access is checked

Protected routes run these middlewares in order ([AC-RBAC-03](../CibusHub_Acceptance_Criteria.md)):

| Step | Middleware | Fails with |
|---|---|---|
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

Notes:

- "Register" is guest-only in practice: an existing account gets `409 ACCOUNT_EXISTS`. Admin roles can never be registered ([AC-AUTH-06](../CibusHub_Acceptance_Criteria.md)); admins are created by a super admin.
- `/me` and `change-password` work for unverified and pending accounts on purpose, so the app can show "verify your phone" or "waiting for approval" and the user can still secure their account.
- Every feature added from Step 5 onward uses `authenticate, requireActive, authorize(...)` and gets a row here.

## Planned (from the acceptance criteria, filled in as each step is built)

| Area | Guest | Customer | Restaurant owner | Rider | Admin | Super admin |
|---|---|---|---|---|---|---|
| Browse approved restaurants and menus | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Own addresses, cart, orders, reviews | — | 🔒 | — | — | read | read |
| Own restaurant profile, menu, incoming orders | — | — | 🔒 | — | ✅ | ✅ |
| Delivery offers, own deliveries, location | — | — | — | 🔒 | read | read |
| Approve restaurants and riders, suspend users, cancel and refund orders | — | — | — | — | ✅ | ✅ |
| Manage admin accounts, platform settings | — | — | — | — | — | ✅ |
