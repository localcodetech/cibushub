import { Router } from "express";
import requireActive from "../../middlewares/requireActive.js";
import validate from "../../middlewares/validate.js";
import { riderEarningsSchema } from "../../validators/rider/riderEarnings.validator.js";
import { earnings } from "../../controllers/rider/riderEarnings.controller.js";

const router = Router();

router.use(requireActive);

// ─────────────────────────────────────────────
// Completed deliveries and earnings for a day, week or month
// ─────────────────────────────────────────────
router.get("/", validate(riderEarningsSchema, "query"), earnings);

export default router;
