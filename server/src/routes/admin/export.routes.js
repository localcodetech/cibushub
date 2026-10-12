import { Router } from "express";
import validate from "../../middlewares/validate.js";
import { analyticsRangeSchema } from "../../validators/admin/analytics.validator.js";
import { exportOrders, exportPayments } from "../../controllers/admin/adminExport.controller.js";

const router = Router();

// ─────────────────────────────────────────────
// Orders placed in a range of days, as a CSV file [AC-ANL-04]
// ─────────────────────────────────────────────
router.get("/orders", validate(analyticsRangeSchema, "query"), exportOrders);

// ─────────────────────────────────────────────
// Payment attempts started in a range of days, as a CSV file [AC-ANL-04]
// ─────────────────────────────────────────────
router.get("/payments", validate(analyticsRangeSchema, "query"), exportPayments);

export default router;
