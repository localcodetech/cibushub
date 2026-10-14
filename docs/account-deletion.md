# Account deletion

How CibusHub removes a person's data when they delete their account ([AC-CUST-11], Data Protection Act, 2012 (Act 843)). The code lives in `server/src/services/profile/deleteAccount.service.js` and `server/src/repositories/accountErasure.repository.js`.

The public page explaining this to users is `/data-deletion` (`client/src/data/legal/dataDeletionSections.js`). Its address goes in the Google and Apple consoles as the data deletion URL; keep its wording in step with this file.

## Who can delete, and how

| Who | How |
| --- | --- |
| The person | My profile → Delete my account. They enter their password (a Google / Apple account without one leaves it empty) and type `DELETE`. `POST /api/v1/auth/delete-account` |
| An admin, on request | Admin → Users → the account → Delete account, with a reason saying when and how the person asked. `POST /api/v1/admin/users/:userId/delete` |

The account must not have anything in progress:

| Blocked while | Error code | What the person is told |
| --- | --- | --- |
| An order is not finished (including one waiting for payment) | `ACCOUNT_HAS_OPEN_ORDERS` | Wait until it's delivered or cancelled |
| A refund is still pending | `ACCOUNT_HAS_PENDING_REFUND` | Wait until it arrives |
| A rider has an active delivery | `ACCOUNT_HAS_ACTIVE_DELIVERY` | Finish the delivery first |
| A restaurant owner still has restaurants | `ACCOUNT_HAS_RESTAURANTS` | Contact support. A restaurant has its own customers, payouts and tax records, so support closes it by hand first |
| The account is an admin or super admin | `ADMIN_ACCOUNT` | The super admin removes admin accounts |

## What is removed

All of these happen in one database transaction, so it's all or nothing.

| Data | What happens |
| --- | --- |
| `users` row | Name → "Deleted user". Email → `deleted-<id>@deleted.invalid` (unique, can never be delivered). These are cleared: phone, password, photo, verified and bounced dates, last login, marketing consent. Status → `SUSPENDED`. Then the row is soft-deleted (`deletedAt`), so logins and session checks no longer find it. The old phone and email can be used to sign up again |
| `addresses` | Deleted |
| `oauth_accounts` (Google / Apple links) | Deleted |
| `refresh_tokens` (sessions, with IP and device) | Deleted, so they're logged out everywhere |
| `notifications` (in-app inbox) | Deleted |
| `orders` (as customer) | Kept for accounting. These are cleared: contact phone, landmark, GhanaPost GPS code, notes to the restaurant and rider. The drop-off point is rounded to 2 decimal places (about 1 km) |
| `rider_profiles` | Kept, because deliveries and ratings point to it. The Ghana Card number is replaced with a `DEL-…` placeholder, the plate is cleared, and they go offline |
| `rider_documents` | Rows deleted, and the private files deleted from Cloudinary |
| `rider_locations` (position history) | Deleted. The live position in Redis is removed too |
| Profile photo | Deleted from Cloudinary |
| Redis | Pending phone or email change codes are removed |

After the transaction, any open live connections are closed and one last email goes to the old address ("Your CibusHub account was deleted"). If any of these later steps fails, the failure is logged; the deletion itself still stands.

## What is kept, and why

| Data | Why |
| --- | --- |
| Orders, order items, payments, refunds, deliveries | Tax and accounting law. None of them name the person any more: they point to an account called "Deleted user" |
| Reviews | Kept, shown as "Deleted user". The text stays because restaurants' ratings depend on it |
| `audit_logs` | Never changed, by design (they can't be edited or deleted). They record who did what, now pointing to "Deleted user" |
| `notification_logs` | Already hold only masked addresses |
| Paystack | Paystack keeps its own records of card payments, under its own privacy policy |

[AC-CUST-11]: ../CibusHub_Acceptance_Criteria.md
