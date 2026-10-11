# API Error Codes

Every failed request returns this shape ([AC-GLOBAL-01](../CibusHub_Acceptance_Criteria.md)):

```json
{ "success": false, "error": { "code": "NOT_FOUND", "message": "Human readable message", "details": [] } }
```

- `code` is stable and meant for the frontend to check. Never change a code once it is in use.
- `message` is for people and may change.
- `details` lists field-level problems (used by `VALIDATION_ERROR`), otherwise empty.

Errors are created with `new AppError(statusCode, code, message, details)` from `server/src/utils/AppError.js` and turned into responses only by `server/src/middlewares/errorHandler.js`.

## General codes

| Code | HTTP | When |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Body, query or route params fail their Zod schema. `details` lists each field and reason |
| `INVALID_JSON` | 400 | The request body is not valid JSON |
| `UNAUTHENTICATED` | 401 | No valid access token |
| `FORBIDDEN` | 403 | Logged in, but the role or ownership check fails |
| `NOT_FOUND` | 404 | Unknown route, or a resource that does not exist (or must stay hidden) |
| `CONFLICT` | 409 | The request clashes with current data |
| `PAYLOAD_TOO_LARGE` | 413 | Body over the 100 kb limit |
| `RATE_LIMITED` | 429 | Too many requests; try again later |
| `INTERNAL_ERROR` | 500 | Unexpected bug. In production the message is always "Something went wrong" |
| `SERVICE_UNAVAILABLE` | 503 | MySQL or Redis is down (health check) |

## Feature codes

Add a row here in the same commit that introduces a new code.

| Code | HTTP | When | Criteria |
|---|---|---|---|
| `ACCOUNT_EXISTS` | 409 | Registering with an email or phone already in use | AC-AUTH-02 |
| `ACCOUNT_SUSPENDED` | 403 | A suspended user logs in or uses a token | AC-AUTH-17 |
| `INVALID_STATUS_TRANSITION` | 409 | A status change that is not allowed (orders, restaurant approval and resubmission) | AC-ORD-02, AC-REST-02, AC-REST-03 |
| `OTP_INVALID` | 400 | Wrong OTP code; message says how many attempts are left | AC-AUTH-09 |
| `OTP_EXPIRED` | 400 | No active code (expired after 5 minutes, or never sent) | AC-AUTH-07 |
| `OTP_ATTEMPTS_EXCEEDED` | 429 | 5 wrong attempts; a new code must be requested | AC-AUTH-09 |
| `INVALID_CREDENTIALS` | 401 | Wrong email/phone or password (always the same message) | AC-AUTH-12 |
| `ACCOUNT_NOT_VERIFIED` | 403 | Logged in, but phone not verified yet; feature blocked | AC-AUTH-08 |
| `ACCOUNT_PENDING_APPROVAL` | 403 | Restaurant owner or rider waiting for admin approval | AC-AUTH-05 |
| `NO_EMAIL` | 400 | Asked to confirm an email, but the account has none | AC-AUTH-01 |
| `EMAIL_ALREADY_VERIFIED` | 409 | Asked to confirm an email that is already confirmed | AC-AUTH-01 |
| `REVIEW_NOT_ALLOWED` | 409 | Reviewing an order that isn't delivered yet | AC-REV-01 |
| `ALREADY_REVIEWED` | 409 | A second review of the same order | AC-REV-01 |
| `REVIEW_WINDOW_CLOSED` | 409 | Reviewing more than 7 days after delivery | AC-REV-03 |
| `REVIEW_EDIT_WINDOW_CLOSED` | 409 | Changing a review more than 24 hours after writing it | AC-REV-03 |
| `ALREADY_REPLIED` | 409 | An owner replying a second time to the same review | AC-REV-06 |
| `REVIEW_HIDDEN` | 409 | A customer changing a review an admin hid | AC-REV-07 |
| `REVIEW_ALREADY_HIDDEN` | 409 | Hiding a review that is already hidden | AC-REV-07 |
| `REVIEW_NOT_HIDDEN` | 409 | Showing a review that isn't hidden | AC-REV-07 |
| `REFUND_NOT_FAILED` | 409 | Retrying a refund that hasn't failed | AC-ADM-06 |
| `ADMIN_ACCOUNT` | 403 | An admin trying to suspend or reactivate another admin (super admin only) | AC-ADM-02, AC-SADM-01 |
| `ALREADY_SUSPENDED` | 409 | Suspending an account that is already suspended | AC-ADM-02 |
| `NOT_SUSPENDED` | 409 | Reactivating an account that isn't suspended | AC-ADM-02 |
| `TERMS_NOT_ACCEPTED` | 400 | Google / Apple sign-in would create a new account, but the Terms were not accepted (sign up first) | AC-AUTH-01 |
| `INVALID_SOCIAL_TOKEN` | 401 | The Google / Apple ID token failed the signature, issuer, audience or expiry check | AC-AUTH-11 |
| `SOCIAL_EMAIL_UNVERIFIED` | 400 | Google / Apple did not confirm the email, so it can't be linked or used for a new account | AC-AUTH-02 |
| `SOCIAL_LOGIN_UNAVAILABLE` | 503 | That provider's client ID is not configured on the server | — |
| `PHONE_TAKEN` | 409 | Adding a phone that another account already uses | AC-AUTH-02 |
| `PHONE_ALREADY_VERIFIED` | 409 | Adding a phone when the account's phone is already verified (use profile change instead) | AC-CUST-02 |
| `CATEGORY_NOT_EMPTY` | 409 | Deleting a menu category that still has items; move or delete them first | AC-MENU-02 |

| `DETAILS_REQUIRED` | 409 | Uploading a rider document before saving the vehicle and Ghana Card details | AC-RIDER-01 |
| `GHANA_CARD_TAKEN` | 409 | The Ghana Card number is already on another rider's application (one card, one rider) | AC-RIDER-01 |
| `OFFER_CLOSED` | 409 | Answering a delivery offer that expired, was declined or was taken by another rider | AC-ASSIGN-04, AC-ASSIGN-05 |
| `DELIVERY_TAKEN` | 409 | Accepting a delivery another rider already took ("This delivery has already been taken") | AC-ASSIGN-05 |
| `RIDER_BUSY` | 409 | Accepting a delivery while already carrying one | AC-RIDER-06 |
| `RIDER_NOT_AVAILABLE` | 409 | Accepting an offer while offline or no longer approved | AC-RIDER-03 |
| `ORDER_NOT_ASSIGNABLE` | 409 | An admin assigning a rider to an order that isn't between acceptance and pickup | AC-ASSIGN-07 |
| `ALREADY_ASSIGNED` | 409 | Assigning the rider who is already on the order | AC-ASSIGN-07 |
| `DELIVERY_ALREADY_PICKED_UP` | 409 | Changing or removing the rider after the food was picked up | AC-ASSIGN-07, AC-ASSIGN-08 |
| `NO_RIDER_ASSIGNED` | 409 | Unassigning when no rider is on the order | AC-ASSIGN-08 |
| `FOOD_NOT_READY` | 409 | "Picked up" before the restaurant marked the order ready | AC-DEL-02 |
| `PICKUP_FAR_FROM_RESTAURANT` | 409 | "Picked up" more than 200 m from the restaurant (or no known location); `details` has the distance; resend with `confirmFarAway: true` | AC-DEL-03 |
| `NOT_PICKED_UP` | 409 | Entering the delivery code before pickup | AC-DEL-06 |
| `WRONG_DELIVERY_CODE` | 400 | Wrong 4-digit code; message says how many attempts are left | AC-DEL-06 |
| `DELIVERY_CODE_LOCKED` | 429 | 5 wrong codes; admins are alerted and can unlock it | AC-DEL-06 |
| `CODE_NOT_LOCKED` | 409 | Customer tried "I've received my food" while the rider can still enter the code | AC-DEL-06 |
| `CALL_THE_CUSTOMER_FIRST` | 409 | "Unreachable" or "not at the address" before 2 counted calls | AC-DEL-08 |
| `ALREADY_REPORTED` | 409 | A second door problem for one delivery | AC-DEL-08 |
| `NOT_AT_DROPOFF` | 409 | Door problem reported more than 300 m from the drop-off pin | AC-DEL-08 |
| `LOCATION_NEEDED` | 409 | Door problem with no known rider location | AC-DEL-08 |
| `NOT_RETURNING` | 409 | "Returned" for a delivery that isn't being returned | AC-DEL-08 |
| `RETURN_FAR_FROM_RESTAURANT` | 409 | "Returned" more than 200 m from the restaurant; `details` has the distance; resend with `confirmFarAway: true` | AC-DEL-08 |
| `RIDER_NOT_APPROVED` | 403 | Going online without an approved rider application | AC-RIDER-02, AC-RIDER-03 |
| `APPLICATION_LOCKED` | 409 | Changing a rider application while it is under review or after approval | AC-RIDER-01 |
| `APPLICATION_INCOMPLETE` | 400 | Submitting a rider application with something missing; `details` lists each (`PHOTO`, `GHANA_CARD`, `DRIVERS_LICENCE`, `DETAILS`) | AC-RIDER-01 |
| `FILE_REQUIRED` | 400 | An upload request arrived without a file in the expected form field | AC-IMG-01 |
| `FILE_TOO_LARGE` | 400 | An uploaded file is over 5 MB | AC-IMG-01 |
| `INVALID_UPLOAD` | 400 | More than one file, or a file in the wrong form field | AC-IMG-01 |
| `UNSUPPORTED_FILE_TYPE` | 400 | The file's real content (magic bytes) is not an allowed type: JPEG, PNG, WebP, or PDF for documents | AC-IMG-01 |
| `CHECKOUT_BLOCKED` | 409 | Placing an order failed because something changed or is wrong (closed, sold out, not enough stock, price changed, out of range). `details` lists every problem, with `menuItemId` for item problems. Nothing is saved | AC-CHK-05, AC-CART-07 |
| `ORDER_NOT_PAYABLE` | 409 | Starting a payment for an order that is not `PENDING_PAYMENT` (already paid, cancelled...) | AC-PAY-01 |
| `PAYMENT_PROVIDER_ERROR` | 502 | Paystack did not answer or refused the request; safe to try again | AC-PAY-01 |
| `INVALID_SIGNATURE` | 401 | A payment webhook whose `x-paystack-signature` does not match the body; nothing is processed | AC-PAY-04 |
| `ADDRESS_LIMIT_REACHED` | 409 | Saving an 11th address; a customer can keep 10 | AC-CUST-08 |
| `MAPS_UNAVAILABLE` | 503 | Place search failed because the geocoder (OpenStreetMap Nominatim) is down or busy; move the pin instead. Pin → area never returns this: it answers with `area: null` | AC-MAP-02, AC-MAP-06 |
| `NOTHING_TO_REFUND` | 409 | A refund was asked for an order that has no successful payment | AC-CANC-04 |
| `REFUND_EXCEEDS_PAID` | 409 | The refund would make the total refunded larger than the amount paid; the message says how much is left | AC-CANC-05 |
| `RECEIPT_NOT_AVAILABLE` | 409 | Asking for the receipt of an order that has not been paid | AC-PAY-15 |
