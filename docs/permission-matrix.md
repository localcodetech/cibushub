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
| `POST /auth/email/send-code`, `/email/verify` | — | 🔒⏳ | 🔒⏳ | 🔒⏳ | 🔒 | 🔒 | authenticate, validate (verify), otpLimiter; only my own email |
| `GET /restaurants` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | validate (query) |
| `GET /restaurants/:id` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — (404 unless approved) |
| `GET /restaurants/:id/reviews` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | validate (query); first name + last initial only (404 unless approved) |
| `POST /cart/check` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | validate (read-only, no login) |
| `POST /webhooks/paystack` | Paystack only | — | — | — | — | — | valid HMAC-SHA512 signature (no login, no CSRF origin) |
| `POST /webhooks/resend` | Resend only | — | — | — | — | — | valid Svix HMAC-SHA256 signature, at most 5 minutes old (no login, no CSRF origin) |
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
| `GET /owner/reviews`, `POST /owner/reviews/:id/reply` | — | — | 🔒 | — | — | — | authenticate, authorize, requireActive, validate; only my restaurants' reviews (others 404); one reply each |
| `GET /owner/analytics` | — | — | 🔒 | — | — | — | authenticate, authorize, requireActive, validate; only my restaurant (others 404, checked before the cache) |
| `GET /admin/restaurants`, `GET /admin/restaurants/:id` | — | — | — | — | ✅ | ✅ | authenticate, requireActive, authorize, validate (query) |
| `GET /admin/restaurants/:id/documents` | — | — | — | — | ✅ | ✅ | authenticate, requireActive, authorize |
| `POST /admin/restaurants/:id/approve` | — | — | — | — | ✅ | ✅ | authenticate, requireActive, authorize; audit logged |
| `POST /admin/restaurants/:id/reject`, `/suspend` | — | — | — | — | ✅ | ✅ | authenticate, requireActive, authorize, validate; audit logged |
| `GET /admin/dashboard` | — | — | — | — | ✅ | ✅ | authenticate, requireActive, authorize; counts only, no personal data |
| `GET /admin/analytics` | — | — | — | — | ✅ | ✅ | authenticate, requireActive, authorize; sums and counts, restaurant names only |
| `GET /admin/payments`, `GET /admin/refunds` | — | — | — | — | ✅ | ✅ | authenticate, requireActive, authorize, validate (query) |
| `POST /admin/payments/:id/reverify` | — | — | — | — | ✅ | ✅ | authenticate, requireActive, authorize; asks Paystack, same rules as the webhook; audit logged |
| `POST /admin/refunds/:id/retry` | — | — | — | — | ✅ | ✅ | authenticate, requireActive, authorize, validate; failed refunds only; reason required; audit logged |
| `GET /admin/users`, `GET /admin/users/:id` | — | — | — | — | ✅ | ✅ | authenticate, requireActive, authorize, validate (query) |
| `POST /admin/users/:id/suspend`, `/reactivate` | — | — | — | — | ✅ | ✅ | authenticate, requireActive, authorize, validate; reason required; not admin accounts; signs out everywhere; audit logged |
| `GET /admin/audit-logs`, `GET /admin/audit-logs/actions` | — | — | — | — | ✅ | ✅ | authenticate, requireActive, authorize, validate (query); read-only |
| `GET /super-admin/admins`, `POST /super-admin/admins` | — | — | — | — | — | ✅ | authenticate, requireActive, authorize (SUPER_ADMIN), validate; creating audited |
| `POST /super-admin/admins/:id/suspend`, `/reactivate`, `/remove`, `PATCH /super-admin/admins/:id/role` | — | — | — | — | — | ✅ | authenticate, requireActive, authorize (SUPER_ADMIN), validate; reason required; never own account; never the last active super admin; audited |
| `GET /super-admin/settings`, `PATCH /super-admin/settings` | — | — | — | — | — | ✅ | authenticate, requireActive, authorize (SUPER_ADMIN), validate; reason required; new version, audited |
| `GET /admin/notifications` | — | — | — | — | ✅ | ✅ | authenticate, requireActive, authorize, validate (query); recipients masked, no message text |
| `GET /admin/reviews`, `POST /admin/reviews/:id/hide`, `/show` | — | — | — | — | ✅ | ✅ | authenticate, requireActive, authorize, validate; reason required; audit logged |
| `GET /admin/riders`, `GET /admin/riders/:id` | — | — | — | — | ✅ | ✅ | authenticate, requireActive, authorize, validate (query) |
| `GET /admin/riders/:id/documents` | — | — | — | — | ✅ | ✅ | authenticate, requireActive, authorize |
| `GET /admin/riders/live` | — | — | — | — | ✅ | ✅ | authenticate, requireActive, authorize; online riders' latest positions |
| `POST /admin/riders/:id/ghana-card/reveal` | — | — | — | — | ✅ | ✅ | authenticate, requireActive, authorize; every reveal audit logged (lists show it masked) |
| `POST /admin/riders/:id/approve` | — | — | — | — | ✅ | ✅ | authenticate, requireActive, authorize; audit logged |
| `POST /admin/riders/:id/reject`, `/suspend` | — | — | — | — | ✅ | ✅ | authenticate, requireActive, authorize, validate; audit logged |
| `GET /admin/orders`, `GET /admin/orders/:id` | — | — | — | — | ✅ | ✅ | authenticate, requireActive, authorize, validate (query); full details incl. earnings split and rider route |
| `POST /admin/orders/:id/rider`, `/rider/unassign` | — | — | — | — | ✅ | ✅ | authenticate, requireActive, authorize, validate; before pickup; audit logged |
| `POST /admin/orders/:id/delivery/unlock-code` | — | — | — | — | ✅ | ✅ | authenticate, requireActive, authorize, validate; picked-up orders; audit logged |
| `POST /admin/orders/:id/cancel` | — | — | — | — | ✅ | ✅ | authenticate, requireActive, authorize, validate; refund choice; audit logged |
| `GET /owner/orders`, `/history`, `/summary`, `/:id` | — | — | 🔒 | — | — | — | authenticate, authorize, requireActive, validate (query) |
| `POST /owner/orders/:id/accept`, `/reject`, `/preparing`, `/ready` | — | — | 🔒 | — | — | — | authenticate, authorize, requireActive, validate; own restaurants only |
| `GET`, `PUT /rider/application` | — | — | — | 🔒⏳ | — | — | authenticate, authorize, requireVerifiedPhone, validate |
| `PUT /rider/application/photo`, `/documents/:type` | — | — | — | 🔒⏳ | — | — | authenticate, authorize, requireVerifiedPhone, upload |
| `POST /rider/application/submit` | — | — | — | 🔒⏳ | — | — | authenticate, authorize, requireVerifiedPhone |
| `GET /rider/status`, `POST /rider/status/online`, `/offline` | — | — | — | 🔒 | — | — | authenticate, authorize, requireActive, validate; approved riders only |
| socket `order:join` | — | 🔒 | 🔒 | 🔒 | ✅ | ✅ | customer: own orders; owner: own restaurants' orders; rider: only the order they are carrying; refused joins are logged |
| socket `rider:location` | — | — | — | 🔒 | — | — | handshake cookie; online riders only; 1 per 3 s, range and speed checked |
| `GET /rider/offers/current`, `POST /rider/offers/:id/accept`, `/decline` | — | — | — | 🔒 | — | — | authenticate, authorize, requireActive; own offers only (404 otherwise); accept locks rider, delivery, offer, order in that order |
| `GET /rider/deliveries/current` | — | — | — | 🔒 | — | — | authenticate, authorize, requireActive; own delivery only; customer name, pin and phone only after pickup |
| `POST /rider/deliveries/current/pickup`, `/complete`, `/call`, `/problem`, `/returned` | — | — | — | 🔒 | — | — | authenticate, authorize, requireActive, validate; own delivery; locks rider, delivery, order |
| `GET /rider/earnings` | — | — | — | 🔒 | — | — | authenticate, authorize, requireActive, validate; own delivered orders only, no customer details |
| `POST /rider/deliveries/current/unassign` | — | — | — | 🔒 | — | — | authenticate, authorize, requireActive, validate; own delivery, before pickup |
| `GET`, `POST /customer/addresses` | — | 🔒 | — | — | — | — | authenticate, requireActive, authorize, validate |
| `PATCH`, `DELETE /customer/addresses/:id` | — | 🔒 | — | — | — | — | authenticate, requireActive, authorize, validate |
| `POST /customer/checkout/quote` | — | 🔒 | — | — | — | — | authenticate, requireActive, authorize, validate |
| `POST /customer/orders` | — | 🔒 | — | — | — | — | authenticate, requireActive, authorize, validate (headers + body) |
| `GET /customer/orders`, `GET /customer/orders/:id` | — | 🔒 | — | — | — | — | authenticate, requireActive, authorize, validate (query) |
| `POST /customer/orders/:id/confirm-received` | — | 🔒 | — | — | — | — | authenticate, requireActive, authorize; own order; only while PICKED_UP with the delivery code locked; audit logged |
| `GET /customer/orders/:id/tracking` | — | 🔒 | — | — | — | — | authenticate, requireActive, authorize; own orders only (404 otherwise); 10 a minute; rider shown only while RIDER_ASSIGNED or PICKED_UP |
| `POST /customer/orders/:id/cancel` | — | 🔒 | — | — | — | — | authenticate, requireActive, authorize, validate; only before the restaurant accepts; full refund if paid |
| `POST /customer/orders/:id/payments` | — | 🔒 | — | — | — | — | authenticate, requireActive, authorize; only while PENDING_PAYMENT |
| `GET /customer/orders/:id/review`, `POST` and `PATCH` the same | — | 🔒 | — | — | — | — | authenticate, requireActive, authorize, validate; only my own delivered order, 7-day window, 24-hour edit |
| `GET /customer/orders/:id/receipt` | — | 🔒 | — | — | — | — | authenticate, requireActive, authorize; only once paid |
| `PATCH /profile` | — | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 | authenticate, requireActive, validate |
| `PATCH /profile/preferences` | — | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 | authenticate, requireActive, validate; only offers and news can be switched off |
| `PUT /profile/avatar` | — | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 | authenticate, requireActive, upload |
| `POST /profile/phone`, `/phone/confirm`, `/email`, `/email/confirm` | — | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 | authenticate, requireActive, validate, otpLimiter |
| `GET /notifications`, `POST /notifications/:id/read`, `/read-all` | — | 🔒⏳ | 🔒⏳ | 🔒⏳ | 🔒 | 🔒 | authenticate, validate; only my own (someone else's is 404); open while waiting for approval |

Notes:

- "Register" is guest-only in practice: an existing account gets `409 ACCOUNT_EXISTS`. Admin roles can never be registered ([AC-AUTH-06](../CibusHub_Acceptance_Criteria.md)); admins are created by a super admin.
- `/me` and `change-password` work for unverified and pending accounts on purpose, so the app can show "verify your phone" or "waiting for approval" and the user can still secure their account.
- Every feature added from Step 5 onward uses `authenticate, requireActive, authorize(...)` and gets a row here.
- Rider application routes work the same way: a rider `PENDING_APPROVAL` fills in and submits their application; going online needs approval.
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
