import { Router } from "express";
import validate from "../../middlewares/validate.js";
import { checkoutQuoteSchema } from "../../validators/checkout/checkout.validator.js";
import { getQuote } from "../../controllers/checkout/checkout.controller.js";
import { quoteLimiter } from "../../middlewares/rateLimit/checkoutLimiters.js";

const router = Router();

// ─────────────────────────────────────────────
// The checkout summary: items, fees, total, address and whether the order can be placed
// ─────────────────────────────────────────────
router.post("/quote", quoteLimiter, validate(checkoutQuoteSchema), getQuote);

export default router;
