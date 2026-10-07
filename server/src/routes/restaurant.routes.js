import { Router } from "express";
import validate from "../middlewares/validate.js";
import { publicListRestaurantsSchema } from "../validators/restaurant/publicListRestaurants.validator.js";
import {
  browseRestaurants,
  viewRestaurant,
} from "../controllers/restaurant/publicRestaurants.controller.js";

const router = Router();

// ─────────────────────────────────────────────
// Browse and search approved restaurants (no login needed)
// ─────────────────────────────────────────────
router.get("/", validate(publicListRestaurantsSchema, "query"), browseRestaurants);

// ─────────────────────────────────────────────
// One restaurant with its menu (404 unless approved)
// ─────────────────────────────────────────────
router.get("/:restaurantId", viewRestaurant);

export default router;
