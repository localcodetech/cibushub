import { z } from "zod";
import { PAYMENT_ATTEMPT_STATUSES } from "../../models/order/payment.model.js";
import { REFUND_STATUSES } from "../../models/order/refund.model.js";
import { paginationFields } from "../pagination.js";

// ?flagged=true or ?status=PENDING, and ?q= a payment reference or order number [AC-ADM-06]
export const adminListPaymentsSchema = z
  .object({
    status: z.enum(PAYMENT_ATTEMPT_STATUSES).optional(),
    flagged: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
    q: z.string().trim().min(3).max(60).optional(),
    ...paginationFields,
  })
  .strict();

// ?status=FAILED
export const adminListRefundsSchema = z
  .object({
    status: z.enum(REFUND_STATUSES).optional(),
    ...paginationFields,
  })
  .strict();

// Trying a failed refund again needs a reason, for the audit log [AC-ADM-08]
export const retryRefundSchema = z
  .object({
    reason: z
      .string("Give a reason")
      .trim()
      .min(10, "Give a clear reason (at least 10 characters)")
      .max(500, "Reason is too long"),
  })
  .strict();
