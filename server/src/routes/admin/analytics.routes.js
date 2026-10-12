import { Router } from "express";
import validate from "../../middlewares/validate.js";
import { analyticsRangeSchema } from "../../validators/admin/analytics.validator.js";
import { showAnalytics } from "../../controllers/admin/adminAnalytics.controller.js";

const router = Router();

// ─────────────────────────────────────────────
// Orders and money per day, orders by status, top restaurants, for a range of days [AC-ANL-01]
// ─────────────────────────────────────────────
router.get("/", validate(analyticsRangeSchema, "query"), showAnalytics);

export default router;
