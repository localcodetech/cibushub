# Background Jobs

Work that must happen later or on a timer runs in a separate **worker** process (`server/src/worker.js`, the `worker` service in `compose.yaml`), using BullMQ queues stored in Redis ([AC-JOB-01 to AC-JOB-04](../CibusHub_Acceptance_Criteria.md)).

## Queues

| Queue | Used for |
|---|---|
| `payments` | unpaid-order expiry, payment reconciliation, refunds |
| `maintenance` | sweepers and clean-up |
| `notifications` | every email and SMS (`sendNotification`): 3 tries, 30 s then 60 s apart |
| `assignment` | rider offers (riders step) |

## Jobs

| Job | Queue | When | What it does |
|---|---|---|---|
| `expireUnpaidOrder` | payments | 30 min after an order is placed (delayed) | Asks Paystack about any pending payment; if still unpaid, cancels with reason `PAYMENT_TIMEOUT` and returns stock |
| `sweepUnpaidOrders` | maintenance | every minute | Safety net: expires overdue unpaid orders even if Redis lost their delayed job |
| `reconcilePayments` | payments | every 10 minutes | Verifies payments still PENDING after 10 min with Paystack (missed webhooks) |
| `processRefund` | payments | right after a refund is asked for | Moves one refund a step: send to Paystack, or check if it finished |
| `processPendingRefunds` | payments | every 5 minutes | Moves every PENDING refund a step (also catches lost `processRefund` jobs) |
| `rejectUnansweredOrder` | payments | 5 min after an order is paid (delayed) | If the restaurant still hasn't answered, rejects with reason `RESTAURANT_TIMEOUT` and refunds in full, in one transaction |
| `sweepUnansweredOrders` | maintenance | every minute | Safety net: rejects PAID orders unanswered for over 5 minutes even if their delayed job was lost |
| `sweepStaleRiders` | maintenance | every minute | Takes online riders with no location for 5 minutes offline and tells their app (`rider:status`) |
| `offerDelivery` | assignment | when the restaurant accepts, after a decline, and 60.5 s after each offer (delayed) | One search step: expires a stale offer, offers the nearest eligible rider within 5 km (once widened to 10 km), or alerts admins and the customer after 10 minutes without a rider |
| `sweepSearchingDeliveries` | assignment | every minute | Runs a search step for every delivery still looking for a rider: catches lost jobs and asks riders who came online since |
| `sweepLockedDeliveryCodes` | maintenance | every minute | Delivery codes locked (5 wrong tries) for 15 minutes with nobody acting: alerts admins again, once per lock (SMS from Step 12) |
| `sweepDoorWaits` | maintenance | every minute | Door problems whose 10-minute wait ran out: cancels the order as SYSTEM (no refund), the delivery becomes RETURNING, rider and restaurant are told |
| `sendNotification` | notifications | on demand | Sends one email (Resend) or SMS (Nalo) logged in `notification_logs`. 3 tries (30 s, then 60 s); a refusal that won't change (no address, bad address, provider not configured) fails at once. The last failure marks the row FAILED and alerts admins (`NOTIFICATION_FAILED`). If Redis can't take the job, the message is sent straight away instead. |
| `cleanupExpiredTokens` | maintenance | daily 03:00 Accra | Deletes expired login sessions |
| `sendDailySummary` | maintenance | daily 23:59 Accra | Emails every active admin the day's paid orders, money, average times, top restaurants and open alerts. Same numbers as the dashboard (docs/analytics.md). One email per admin per day (key `daily-summary:<day>`), even if the job runs twice [AC-JOB-02, COULD] |

## Rules

- **Re-check before acting** (AC-JOB-03): every job looks at the current state first. The expiry job also uses `onlyIfStatus: "PENDING_PAYMENT"`, checked with the order row locked, so an order paid a moment earlier is never cancelled.
- **Retries** (AC-JOB-04): 5 attempts with exponential backoff (10 s, 20 s, 40 s...). Failed jobs are kept for inspection (`removeOnFail: false`) and logged with the error. Sentry reporting comes with the monitoring step.
- **If Paystack is unreachable**, the expiry job fails and retries instead of cancelling an order that may have been paid.
- **Redis safety** (plan review C2): Redis runs with append-only persistence, and every delayed job has a sweeper, so losing Redis data delays an expiry by at most one minute.
- **Tests** never send jobs to Redis: `tests/setup.js` records scheduled jobs in `tests/helpers/fakeJobs.js`, and job logic is tested by calling the service functions directly.
