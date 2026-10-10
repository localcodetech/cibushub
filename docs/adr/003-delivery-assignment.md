# ADR 003: Delivery assignment lives beside the order status

- **Status:** Accepted
- **Date:** 2026-10-10
- **Step:** 11 (Riders, Assignment and Delivery)
- **Resolves:** plan-review C9 and C15

## Context

AC-ASSIGN-01 lets the search for a rider start when the restaurant **accepts** an order, so the rider can travel while the food cooks. But the order state machine (AC-ORD-03) only allows `READY_FOR_PICKUP → RIDER_ASSIGNED`. If assignment changed the order status, a rider accepting while the food is still `PREPARING` would either break the state machine or wait 10–20 minutes for the food before even being asked.

## Decision

Delivery facts get their own tables, and the order status stays exactly as AC-ORD-01 defines it.

| Table | Holds |
|---|---|
| `deliveries` (one per order) | the rider, the delivery's own status, the search radius, pickup and drop-off times, pickup distance and flag, the hashed 4-digit code, failure reason |
| `delivery_offers` (one per rider asked) | when the rider was asked, how far they were, when the offer expires, and the outcome: `PENDING`, `ACCEPTED`, `DECLINED`, `EXPIRED`, `SUPERSEDED` |

**The business rule (AC-ASSIGN-01):**

1. The search starts when the order becomes `ACCEPTED`. A `deliveries` row is created as `SEARCHING`.
2. A rider who accepts is recorded on the delivery (`ASSIGNED`). The order status does not change yet.
3. The **order** moves to `RIDER_ASSIGNED` when both are true: the order is `READY_FOR_PICKUP` **and** the delivery has a rider. It happens at whichever moment comes second: the rider accepting, or the restaurant tapping "Ready for pickup".
4. Pickup and delivery update both: the rider taps "Picked up" (delivery `PICKED_UP`, order `PICKED_UP`), then confirms with the customer's code (delivery and order `DELIVERED`).

**Delivery statuses:** `SEARCHING → ASSIGNED → PICKED_UP → DELIVERED`, with `FAILED` (customer unreachable, AC-DEL-08) and `CANCELLED` (the order was cancelled). A rider holds at most one `ASSIGNED` or `PICKED_UP` delivery (AC-RIDER-06).

**Never twice:** a unique index on `(delivery_id, rider_profile_id)` means a rider who declined, or let an offer expire, is never asked again for the same delivery (AC-ASSIGN-04).

**Locking (AC-ASSIGN-05):** "Accept" locks the rider's row, then the delivery, then the offer, then the order. "Ready for pickup" locks the delivery, then the order. Because every path takes locks in the same order, two riders tapping at once simply queue: the second finds the delivery `ASSIGNED` and gets `409 DELIVERY_TAKEN`. Accepting also closes the rider's other waiting offers (`SUPERSEDED`), and those deliveries search again.

## Consequences

- The customer and restaurant still see the statuses from AC-ORD-01. The rider's screens read the delivery.
- Admins and analytics get the full offer history: who was asked, who declined, how long assignment took (AC-ANL-02).
- A rider silent for 5 minutes while holding an active delivery is not taken offline; admins are alerted instead (plan-review C10).
