import { Router } from "express";
import validate from "../../middlewares/validate.js";
import { adminCancelOrderSchema } from "../../validators/order/adminCancelOrder.validator.js";
import {
  assignRiderSchema,
  unassignRiderSchema,
} from "../../validators/order/manualAssignment.validator.js";
import { unlockDeliveryCodeSchema } from "../../validators/order/deliveryFlow.validator.js";
import {
  assignRiderAsAdmin,
  cancelOrderAsAdmin,
  unassignRiderAsAdmin,
  unlockDeliveryCodeAsAdmin,
} from "../../controllers/admin/adminOrders.controller.js";

const router = Router();

// ─────────────────────────────────────────────
// Cancel any unfinished order, with a reason and a full, partial or no refund
// ─────────────────────────────────────────────
router.post("/:orderId/cancel", validate(adminCancelOrderSchema), cancelOrderAsAdmin);

// ─────────────────────────────────────────────
// Give the order to a chosen rider, or replace its rider, before pickup
// ─────────────────────────────────────────────
router.post("/:orderId/rider", validate(assignRiderSchema), assignRiderAsAdmin);

// ─────────────────────────────────────────────
// Take the rider off the order (it goes back to the search), before pickup
// ─────────────────────────────────────────────
router.post("/:orderId/rider/unassign", validate(unassignRiderSchema), unassignRiderAsAdmin);

// ─────────────────────────────────────────────
// After 5 wrong delivery codes: checked with the customer, let the rider try again
// ─────────────────────────────────────────────
router.post(
  "/:orderId/delivery/unlock-code",
  validate(unlockDeliveryCodeSchema),
  unlockDeliveryCodeAsAdmin,
);

export default router;
