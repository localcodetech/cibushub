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
| `INVALID_STATUS_TRANSITION` | 409 | An order status change not allowed by the state machine | AC-ORD-02 |


| `OTP_INVALID` | 400 | Wrong OTP code; message says how many attempts are left | AC-AUTH-09 |
| `OTP_EXPIRED` | 400 | No active code (expired after 5 minutes, or never sent) | AC-AUTH-07 |
| `OTP_ATTEMPTS_EXCEEDED` | 429 | 5 wrong attempts; a new code must be requested | AC-AUTH-09 |

| `INVALID_CREDENTIALS` | 401 | Wrong email/phone or password (always the same message) | AC-AUTH-12 |

| `ACCOUNT_NOT_VERIFIED` | 403 | Logged in, but phone not verified yet; feature blocked | AC-AUTH-08 |
| `ACCOUNT_PENDING_APPROVAL` | 403 | Restaurant owner or rider waiting for admin approval | AC-AUTH-05 |

