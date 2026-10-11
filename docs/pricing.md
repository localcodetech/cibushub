# Pricing

How the server works out what a customer pays ([AC-CHK-02, AC-CHK-03, AC-MAP-06](../CibusHub_Acceptance_Criteria.md)). The browser never sends prices that are trusted.

## Money rules

- Every amount is a whole number of **pesewas** (GHS 1.00 = 100 pesewas). No decimals in the backend.
- Money is divided and rounded in exactly one place: `divideAndRound` in `server/src/utils/money.js`, which rounds half up (2.5 → 3).
- Amounts are shown as `GHS X.XX` only in the frontend.

## Item prices

- Unit price = the menu item's price + the extra price of each chosen option.
- Line total = unit price × quantity (1 to 50).
- Subtotal = the sum of line totals.

## Delivery fee

Rules live in `server/src/utils/delivery/deliveryFee.js` (`DELIVERY_FEE_RULES`).

```
straight line km = haversine distance between the restaurant pin and the address pin
road metres      = round(straight line km × 1000 × 1.3)
delivery fee     = 500 + divideAndRound(road metres × 200, 1000)     (pesewas)
```

That is: **GHS 5.00 base + GHS 2.00 per road kilometre**. Example: 2.2 km straight line → 2,860 road metres → 500 + 572 = **1,072 pesewas (GHS 10.72)**.

- The 1.3 road factor stands in for real road distance until Google Routes is connected (AC-MAP-06 fallback). `pricingSnapshot.distanceSource` records which one was used.
- **Delivery radius** is checked on the straight line, the same way the restaurant listing shows "delivers to you". Beyond it: `OUT_OF_DELIVERY_RANGE` (AC-CHK-04).

## Other fees

- Service fee: 0 for now.
- Discount: 0 until promo codes (AC-CHK-12).

## Total

```
total = subtotal + delivery fee + service fee − discount
```

## Shown = charged

The checkout quote and order placement call the same `buildQuote` function, and the order stores a `pricing_snapshot` with the formula and inputs used. A later change to the rules never changes a past order (AC-CHK-03).

## Who gets what

All the customer's money lands in CibusHub's Paystack account. Each order freezes how it is shared when it is placed, in `server/src/utils/order/earnings.js` (`EARNINGS_RULES`):

```
commission          = divideAndRound(subtotal × 10, 100)      CibusHub keeps 10% of the food
restaurant earnings = subtotal − commission                   what is left, so the parts always add up
rider earnings      = divideAndRound(delivery fee × 100, 100)  the rider gets the whole delivery fee
```

Example: subtotal GHS 95.00, delivery GHS 10.72 → commission **GHS 9.50**, restaurant **GHS 85.50**, rider **GHS 10.72**.

- The four columns (`commission_percent`, `commission_pesewas`, `restaurant_earnings_pesewas`, `rider_earnings_pesewas`) are frozen on the order, so a later rate change never changes a past order.
- Customers never see them. The `Order` model hides them by default; owner, rider and admin queries use `Order.scope("withEarnings")`.
- Restaurants earn only on `DELIVERED` orders. Riders earn on delivered orders, and **1.5x** on an order whose food they had to take back to the restaurant (nobody took it at the door; ADR 003). CibusHub pays that extra half from the order money it keeps, since the customer is not refunded. Orders cancelled before pickup earn the rider nothing. What a rider actually earned is saved on the delivery (`rider_payout_pesewas`).
- The service fee (0 now) and the Paystack fee belong to CibusHub. Promo discounts (later) are paid by CibusHub, so the commission is worked out on the subtotal before any discount.
- Later: the rates move into the SUPER_ADMIN platform settings (AC-ADM), weekly payouts to restaurants and riders by Paystack Transfers, and rider tips (100% to the rider). None of these are built yet.
