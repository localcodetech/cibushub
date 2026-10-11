import { Router } from "express";
import validate from "../../middlewares/validate.js";
import {
  adminListPaymentsSchema,
  adminListRefundsSchema,
  retryRefundSchema,
} from "../../validators/admin/adminPayments.validator.js";
import {
  listPayments,
  listRefunds,
  retry,
  reverify,
} from "../../controllers/admin/adminPayments.controller.js";

const router = Router();

// ─────────────────────────────────────────────
// Every payment attempt (?flagged=true for the ones that need a person) [AC-ADM-06]
// ─────────────────────────────────────────────
router.get("/payments", validate(adminListPaymentsSchema, "query"), listPayments);

// ─────────────────────────────────────────────
// Ask Paystack again about one payment (audited)
// ─────────────────────────────────────────────
router.post("/payments/:paymentId/reverify", reverify);

// ─────────────────────────────────────────────
// Every refund (?status=FAILED)
// ─────────────────────────────────────────────
router.get("/refunds", validate(adminListRefundsSchema, "query"), listRefunds);

// ─────────────────────────────────────────────
// Send a failed refund to Paystack again, with a reason (audited)
// ─────────────────────────────────────────────
router.post("/refunds/:refundId/retry", validate(retryRefundSchema), retry);

export default router;
