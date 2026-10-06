import { Router } from "express";
import requireVerifiedPhone from "../../middlewares/requireVerifiedPhone.js";
import validate from "../../middlewares/validate.js";
import { createRestaurantSchema } from "../../validators/restaurant/createRestaurant.validator.js";
import { createRestaurant } from "../../controllers/restaurant/createRestaurant.controller.js";
import {
  getRestaurant,
  listRestaurants,
} from "../../controllers/restaurant/myRestaurants.controller.js";

const router = Router();

// ─────────────────────────────────────────────
// Submit a new restaurant for admin approval
// ─────────────────────────────────────────────
router.post("/", requireVerifiedPhone, validate(createRestaurantSchema), createRestaurant);

// ─────────────────────────────────────────────
// List my restaurants (any status), newest first
// ─────────────────────────────────────────────
router.get("/", requireVerifiedPhone, listRestaurants);

// ─────────────────────────────────────────────
// View one of my restaurants (404 if it is not mine)
// ─────────────────────────────────────────────
router.get("/:restaurantId", requireVerifiedPhone, getRestaurant);

export default router;
