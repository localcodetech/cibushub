import { Router } from "express";
import validate from "../middlewares/validate.js";
import { cartCheckSchema } from "../validators/cart/cartCheck.validator.js";
import { checkMyCart } from "../controllers/cart/cartCheck.controller.js";

const router = Router();

// ─────────────────────────────────────────────
// Re-check a cart against today's menu: prices, availability, open or closed (no login needed)
// ─────────────────────────────────────────────
router.post("/check", validate(cartCheckSchema), checkMyCart);

export default router;
