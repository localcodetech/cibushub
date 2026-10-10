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
| `deliveries` (one per order) | the rider, the delivery's own status, the search radius, pickup and drop-off times, pickup distance and flag, wrong-code attempts, failure reason |
| `delivery_offers` (one per rider asked) | when the rider was asked, how far they were, when the offer expires, and the outcome: `PENDING`, `ACCEPTED`, `DECLINED`, `EXPIRED`, `SUPERSEDED` |

**The business rule (AC-ASSIGN-01):**

1. The search starts when the order becomes `ACCEPTED`. A `deliveries` row is created as `SEARCHING`.
2. A rider who accepts is recorded on the delivery (`ASSIGNED`). The order status does not change yet.
3. The **order** moves to `RIDER_ASSIGNED` when both are true: the order is `READY_FOR_PICKUP` **and** the delivery has a rider. It happens at whichever moment comes second: the rider accepting, or the restaurant tapping "Ready for pickup".
4. Pickup and delivery update both: the rider taps "Picked up" (delivery `PICKED_UP`, order `PICKED_UP`), then confirms with the customer's code (delivery and order `DELIVERED`).

**The 4-digit delivery code (AC-DEL-06):** the customer must see it in their app, so a one-way hash can't be used. The code is worked out from the delivery's id with a server secret (HMAC), so it is never stored; a database leak doesn't reveal it, and nobody can guess it without the secret. It is shown to the customer only while the order is `PICKED_UP`. Five wrong codes lock it and admins are alerted.

**Pickup (AC-DEL-02, AC-DEL-03):** "Picked up" works only once the order is `RIDER_ASSIGNED` (food ready). More than 200 m from the restaurant, or with no known location, the rider is warned and must confirm; the pickup is then saved with `pickup_flagged` and admins are alerted.

**Delivery statuses:** `SEARCHING → ASSIGNED → PICKED_UP → DELIVERED`, with `FAILED` (customer unreachable, AC-DEL-08) and `CANCELLED` (the order was cancelled). A rider holds at most one `ASSIGNED` or `PICKED_UP` delivery (AC-RIDER-06).

**Never twice:** a unique index on `(delivery_id, rider_profile_id)` means a rider who declined, or let an offer expire, is never asked again for the same delivery (AC-ASSIGN-04).

**Locking (AC-ASSIGN-05):** "Accept" locks the rider's row, then the delivery, then the offer, then the order. "Ready for pickup" locks the delivery, then the order. Because every path takes locks in the same order, two riders tapping at once simply queue: the second finds the delivery `ASSIGNED` and gets `409 DELIVERY_TAKEN`. Accepting also closes the rider's other waiting offers (`SUPERSEDED`), and those deliveries search again.

**Manual assignment and unassignment (AC-ASSIGN-07, 08):**

- An admin can give the order to any approved, online, free rider until pickup. If the food is ready, the order moves to `RIDER_ASSIGNED` with the admin as actor and the reason in the status history. Replacing a rider writes two history rows: back to `READY_FOR_PICKUP` ("Rider replaced by an admin: …"), then `RIDER_ASSIGNED`. Every change also writes an audit log line.
- An admin's pick is stored as an `ACCEPTED` offer, so the offer history stays complete.
- The rider (breakdown) or an admin can take the rider off before pickup, with a reason. The delivery goes back to `SEARCHING` with a fresh search, and an order that showed `RIDER_ASSIGNED` returns to `READY_FOR_PICKUP`. That move was added to the state machine for this (decided with the product owner on 2026-10-10). The released rider has an offer on record, so they are never asked again for that delivery.
- An admin cancelling the order also cancels its delivery, so the rider is free again.

## Consequences

- The customer and restaurant still see the statuses from AC-ORD-01. The rider's screens read the delivery.
- Admins and analytics get the full offer history: who was asked, who declined, how long assignment took (AC-ANL-02).
- A rider silent for 5 minutes while holding an active delivery is not taken offline; admins are alerted instead (plan-review C10).
