import { Router } from "express";
import validate from "../../middlewares/validate.js";
import { checkoutQuoteSchema } from "../../validators/checkout/checkout.validator.js";
import { idempotencyHeaderSchema } from "../../validators/order/placeOrder.validator.js";
import { createOrder } from "../../controllers/order/placeOrder.controller.js";

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

export default router;
