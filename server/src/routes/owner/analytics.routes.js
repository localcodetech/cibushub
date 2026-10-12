import { Router } from "express";
import validate from "../../middlewares/validate.js";
import requireActive from "../../middlewares/requireActive.js";
import { ownerAnalyticsSchema } from "../../validators/restaurant/ownerAnalytics.validator.js";
import { showRestaurantAnalytics } from "../../controllers/restaurant/ownerAnalytics.controller.js";

const router = Router();

// For approved, active owners only
router.use(requireActive);

// ─────────────────────────────────────────────
// One of my restaurants: orders, earnings, best sellers and ratings per day [AC-ANL-03]
// ─────────────────────────────────────────────
router.get("/", validate(ownerAnalyticsSchema, "query"), showRestaurantAnalytics);

export default router;
