# Analytics: what the numbers count

The admin charts at `GET /api/v1/admin/analytics` [AC-ANL-01] follow these rules. AC-ANL-05 requires
the totals to match the records "as documented", and this is that documentation.

## Days

- A day is a Ghana day (`Africa/Accra`). Ghana is on UTC all year, so a Ghana day is a UTC day.
- An order counts on **the day it became PAID**, which is the time of its `PAID` row in
  `order_status_history`. It does not count on the day it was placed or delivered.
- A range can be at most 92 days, with both ends included. A day with no orders shows 0, not a gap.

## The numbers

| Number | What it counts | Left out |
|---|---|---|
| **Orders** (per day) | Orders that became PAID that day | Orders never paid (`PENDING_PAYMENT`, or cancelled while unpaid) |
| **Customers paid** | Order total (food + delivery + service fee − discount) minus refunds with status `PROCESSED` | Unpaid orders. Refunded money. A refund that is `PENDING` or `FAILED` still counts as paid, because the money has not gone back yet |
| **CibusHub kept** | Commission + service fee, on orders that reached `DELIVERED` | Orders cancelled, rejected or refunded. Orders not delivered yet (they move in once delivered) |
| **Orders by status** | Orders **placed** in the range, by their status now | Nothing: unpaid orders are included so admins can see them |
| **Top restaurants** | The 5 restaurants with the most "customers paid" in the range | Same as "customers paid" |

So a fully refunded order adds 1 to **Orders** and 0 to both money lines.

## How fast orders move [AC-ANL-02]

These cover orders that became PAID in the range. Each time runs from an order's **first** arrival
in one status to its first arrival in the next, taken from `order_status_history`.

| Average | From → to | Orders counted |
|---|---|---|
| Restaurant acceptance | `PAID` → `ACCEPTED` | Orders that were accepted |
| Preparation | `ACCEPTED` → `READY_FOR_PICKUP` | Orders that got ready. This is the whole kitchen time, because owners may tap "Preparing" late |
| Finding a rider | `READY_FOR_PICKUP` → `RIDER_ASSIGNED` | Orders that got a rider. If a rider was unassigned, only the first assignment counts |
| Delivery | `PICKED_UP` → `DELIVERED` | Delivered orders |
| Paid to delivered | `PAID` → `DELIVERED` | Delivered orders |

- **Rejection rate** = paid orders now `REJECTED` ÷ paid orders.
- **Cancellation rate** = paid orders now `CANCELLED` ÷ paid orders. Unpaid orders that expired are
  not counted.
- Both rates are whole percentages.
- An average with no orders behind it is `null` ("no data"), not 0.

## Known limits

- **Door problems (ADR 003).** When a customer can't be reached, the order is `CANCELLED` with no
  refund. The customer's money counts under "customers paid", but CibusHub kept shows 0 for it.
  What CibusHub really keeps on these orders (after paying the rider's extra half) is worked out
  when payouts are built.
- **Rider and restaurant shares** are not charted here. They are frozen on each order (see
  [pricing.md](pricing.md)).
- **Cash on delivery** is not built yet. When it is, a cash order counts on the day the rider
  confirms the cash (plan-review C16).

## Speed [AC-ANL-06]

- Every number is a single `GROUP BY` in MySQL.
- `order_status_history (to_status, created_at)` finds the PAID changes in a range, and
  `orders (created_at)` serves "orders by status".
- Results are cached in Redis for 2 minutes per range (`analytics:admin:<from>:<to>`), so a chart
  can be up to 2 minutes behind.
