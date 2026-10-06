import { Router } from "express";
import validate from "../../middlewares/validate.js";
import { adminListRestaurantsSchema } from "../../validators/restaurant/adminListRestaurants.validator.js";
import {
  rejectRestaurantSchema,
  suspendRestaurantSchema,
} from "../../validators/restaurant/reviewRestaurant.validator.js";
import {
  getAnyRestaurant,
  listAllRestaurants,
} from "../../controllers/restaurant/adminListRestaurants.controller.js";
import {
  approve,
  reject,
  suspend,
} from "../../controllers/restaurant/reviewRestaurant.controller.js";

const router = Router();

// ─────────────────────────────────────────────
// List restaurants, filtered by status, oldest first (the review queue)
// ─────────────────────────────────────────────
router.get("/", validate(adminListRestaurantsSchema, "query"), listAllRestaurants);

// ─────────────────────────────────────────────
// View any restaurant with its opening hours
// ─────────────────────────────────────────────
router.get("/:restaurantId", getAnyRestaurant);

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
