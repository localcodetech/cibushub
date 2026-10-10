import { Router } from "express";
import requireActive from "../../middlewares/requireActive.js";
import validate from "../../middlewares/validate.js";
import { unassignRiderSchema } from "../../validators/order/manualAssignment.validator.js";
import { giveUp } from "../../controllers/rider/riderDeliveries.controller.js";

const router = Router();

router.use(requireActive);

// ─────────────────────────────────────────────
// I can't continue (e.g. breakdown): give the order back before pickup
// ─────────────────────────────────────────────
router.post("/current/unassign", validate(unassignRiderSchema), giveUp);

export default router;
