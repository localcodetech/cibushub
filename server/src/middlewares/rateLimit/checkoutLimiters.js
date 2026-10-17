import { byUser, createRateLimiter } from "./createRateLimiter.js";

// Stricter limits on checkout, per customer [AC-SEC-04]. Each of these does real work:
// prices are recalculated, stock is held, and paying calls Paystack.
const ONE_MINUTE = 60;
const TEN_MINUTES = 10 * 60;

// The checkout summary is recalculated as the cart changes: plenty of room for that
export const quoteLimiter = createRateLimiter({
  name: "checkout-quote",
  windowSeconds: ONE_MINUTE,
  limit: 60,
  keyBy: byUser,
});

// Nobody places more than 10 orders in 10 minutes for real. (A double tap on "Place order"
// doesn't count twice anyway: the Idempotency-Key returns the first order.)
export const placeOrderLimiter = createRateLimiter({
  name: "place-order",
  windowSeconds: TEN_MINUTES,
  limit: 10,
  keyBy: byUser,
});

// Starting a payment (or retrying one after a failure) asks Paystack each time
export const startPaymentLimiter = createRateLimiter({
  name: "start-payment",
  windowSeconds: TEN_MINUTES,
  limit: 10,
  keyBy: byUser,
});
