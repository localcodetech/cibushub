import { Router } from "express";
import validate from "../../middlewares/validate.js";
import { checkoutQuoteSchema } from "../../validators/checkout/checkout.validator.js";
import { idempotencyHeaderSchema } from "../../validators/order/placeOrder.validator.js";
import {
  cancelOrderSchema,
  listMyOrdersSchema,
} from "../../validators/order/myOrders.validator.js";
import { createOrder } from "../../controllers/order/placeOrder.controller.js";
import { cancelOrder, getOrder, listOrders } from "../../controllers/order/myOrders.controller.js";

const router = Router();

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
// Cancel one of my orders (only before the restaurant accepts)
// ─────────────────────────────────────────────
router.post("/:orderId/cancel", validate(cancelOrderSchema), cancelOrder);

export default router;
