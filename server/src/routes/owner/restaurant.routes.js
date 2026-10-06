import { Router } from "express";
import requireVerifiedPhone from "../../middlewares/requireVerifiedPhone.js";
import validate from "../../middlewares/validate.js";
import { createRestaurantSchema } from "../../validators/restaurant/createRestaurant.validator.js";
import { createRestaurant } from "../../controllers/restaurant/createRestaurant.controller.js";

const router = Router();

// ─────────────────────────────────────────────
// Submit a new restaurant for admin approval
// ─────────────────────────────────────────────
router.post("/", requireVerifiedPhone, validate(createRestaurantSchema), createRestaurant);

export default router;
