import { Router } from "express";
import validate from "../../middlewares/validate.js";
import {
  rejectRestaurantSchema,
  suspendRestaurantSchema,
} from "../../validators/restaurant/reviewRestaurant.validator.js";
import {
  approve,
  reject,
  suspend,
} from "../../controllers/restaurant/reviewRestaurant.controller.js";

const router = Router();

// ─────────────────────────────────────────────
// Approve a pending restaurant, or reinstate a suspended one
// ─────────────────────────────────────────────
router.post("/:restaurantId/approve", approve);

// ─────────────────────────────────────────────
// Reject a pending restaurant (reason required)
// ─────────────────────────────────────────────
router.post("/:restaurantId/reject", validate(rejectRestaurantSchema), reject);

// ─────────────────────────────────────────────
// Suspend an approved restaurant (reason required)
// ─────────────────────────────────────────────
router.post("/:restaurantId/suspend", validate(suspendRestaurantSchema), suspend);

export default router;
