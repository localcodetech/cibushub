import { Router } from "express";
import validate from "../../middlewares/validate.js";
import { checkoutQuoteSchema } from "../../validators/checkout/checkout.validator.js";
import { idempotencyHeaderSchema } from "../../validators/order/placeOrder.validator.js";
import {
  cancelOrderSchema,
  listMyOrdersSchema,
} from "../../validators/order/myOrders.validator.js";
import { createOrder } from "../../controllers/order/placeOrder.controller.js";
import {
  cancelOrder,
  getOrder,
  getReceipt,
  downloadReceiptPdf,
  getTracking,
  listOrders,
} from "../../controllers/order/myOrders.controller.js";
import { payForOrder } from "../../controllers/payment/startPayment.controller.js";
import { getPaymentStatus } from "../../controllers/payment/paymentStatus.controller.js";
import { createRateLimiter } from "../../middlewares/rateLimit/createRateLimiter.js";

const router = Router();

// The "Confirming payment" page asks every few seconds; each ask may call Paystack
const paymentStatusLimiter = createRateLimiter({
  name: "payment-status",
  windowSeconds: 60,
  limit: 30,
  keyBy: (req) => `user:${req.user.id}`,
});

// The tracking map reloads every minute (for the ETA); the rider's moves come by socket.
// A little room for reconnects and refreshes, but no hammering [AC-MAP-03, AC-MAP-05]
const trackingLimiter = createRateLimiter({
  name: "order-tracking",
  windowSeconds: 60,
  limit: 10,
  keyBy: (req) => `user:${req.user.id}`,
});

// ─────────────────────────────────────────────
// Place an order (same body as the quote, plus an Idempotency-Key header)
// ─────────────────────────────────────────────
router.post(
  "/",
  validate(idempotencyHeaderSchema, "headers"),
  validate(checkoutQuoteSchema),
  createOrder,
);

// ─────────────────────────────────────────────
// My orders, newest first
// ─────────────────────────────────────────────
router.get("/", validate(listMyOrdersSchema, "query"), listOrders);

// ─────────────────────────────────────────────
// One of my orders, with its timeline
// ─────────────────────────────────────────────
router.get("/:orderId", getOrder);

// ─────────────────────────────────────────────
// Live tracking: the rider, where they are, and about how long [AC-RT-04]
// ─────────────────────────────────────────────
router.get("/:orderId/tracking", trackingLimiter, getTracking);

// ─────────────────────────────────────────────
// Cancel one of my orders (only before the restaurant accepts)
// ─────────────────────────────────────────────
router.post("/:orderId/cancel", validate(cancelOrderSchema), cancelOrder);

// ─────────────────────────────────────────────
// Pay for my order with Paystack (card or mobile money); call again to retry after a failure
// ─────────────────────────────────────────────
router.post("/:orderId/payments", payForOrder);

// ─────────────────────────────────────────────
// Has my payment gone through? The server asks Paystack itself (the page never decides)
// ─────────────────────────────────────────────
router.get("/:orderId/payment-status", paymentStatusLimiter, getPaymentStatus);

// ─────────────────────────────────────────────
// The receipt of one of my paid orders
// ─────────────────────────────────────────────
router.get("/:orderId/receipt", getReceipt);

// ─────────────────────────────────────────────
// The receipt as a PDF file to download
// ─────────────────────────────────────────────
router.get("/:orderId/receipt/pdf", downloadReceiptPdf);

export default router;
