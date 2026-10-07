import { Router } from "express";
import validate from "../../middlewares/validate.js";
import { adminCancelOrderSchema } from "../../validators/order/adminCancelOrder.validator.js";
import { cancelOrderAsAdmin } from "../../controllers/admin/adminOrders.controller.js";

const router = Router();

// ─────────────────────────────────────────────
// Cancel any unfinished order, with a reason and a full, partial or no refund
// ─────────────────────────────────────────────
router.post("/:orderId/cancel", validate(adminCancelOrderSchema), cancelOrderAsAdmin);

export default router;
