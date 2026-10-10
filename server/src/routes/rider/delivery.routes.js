import { Router } from "express";
import requireActive from "../../middlewares/requireActive.js";
import validate from "../../middlewares/validate.js";
import { unassignRiderSchema } from "../../validators/order/manualAssignment.validator.js";
import {
  completeDeliverySchema,
  pickupSchema,
} from "../../validators/order/deliveryFlow.validator.js";
import {
  complete,
  current,
  giveUp,
  pickUp,
} from "../../controllers/rider/riderDeliveries.controller.js";

const router = Router();

router.use(requireActive);

// ─────────────────────────────────────────────
// The delivery in hand: pickup point, then drop-off details (null when none)
// ─────────────────────────────────────────────
router.get("/current", current);

// ─────────────────────────────────────────────
// "Picked up" (200 m check), then "Delivered" with the customer's code
// ─────────────────────────────────────────────
router.post("/current/pickup", validate(pickupSchema), pickUp);
router.post("/current/complete", validate(completeDeliverySchema), complete);

// ─────────────────────────────────────────────
// I can't continue (e.g. breakdown): give the order back before pickup
// ─────────────────────────────────────────────
router.post("/current/unassign", validate(unassignRiderSchema), giveUp);

export default router;
