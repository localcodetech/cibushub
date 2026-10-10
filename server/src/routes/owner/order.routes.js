import { Router } from "express";
import validate from "../../middlewares/validate.js";
import requireActive from "../../middlewares/requireActive.js";
import {
  acceptOrderSchema,
  ownerBoardSchema,
  ownerHistorySchema,
  ownerSummarySchema,
  rejectOrderSchema,
} from "../../validators/order/ownerOrders.validator.js";
import {
  accept,
  getBoard,
  getHistory,
  getOrder,
  getSummary,
  preparing,
  ready,
  reject,
} from "../../controllers/order/ownerOrders.controller.js";

const router = Router();

// Handling orders is for approved, active owners only (onboarding routes stay open to pending ones)
router.use(requireActive);

// ─────────────────────────────────────────────
// The board: every order still in my kitchen, oldest first
// ─────────────────────────────────────────────
router.get("/", validate(ownerBoardSchema, "query"), getBoard);

// ─────────────────────────────────────────────
// Past orders by day and status, and the day's numbers
// ─────────────────────────────────────────────
router.get("/history", validate(ownerHistorySchema, "query"), getHistory);
router.get("/summary", validate(ownerSummarySchema, "query"), getSummary);

// ─────────────────────────────────────────────
// One order, as the kitchen sees it
// ─────────────────────────────────────────────
router.get("/:orderId", getOrder);

// ─────────────────────────────────────────────
// Accept (with a preparation time) or reject (with a reason; paid orders are refunded)
// ─────────────────────────────────────────────
router.post("/:orderId/accept", validate(acceptOrderSchema), accept);
router.post("/:orderId/reject", validate(rejectOrderSchema), reject);

// ─────────────────────────────────────────────
// One tap each: start preparing, ready for pickup
// ─────────────────────────────────────────────
router.post("/:orderId/preparing", preparing);
router.post("/:orderId/ready", ready);

export default router;
