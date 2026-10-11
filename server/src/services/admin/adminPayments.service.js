import sequelize from "../../config/database.js";
import AppError from "../../utils/AppError.js";
import { buildPageMeta, toLimitAndOffset } from "../../utils/pagination.js";
import { UNPAID_ORDER_MINUTES, scheduleRefund } from "../../jobs/enqueue.js";
import { reconcilePayment } from "../payment/paystackWebhook.service.js";
import { saveAuditLog } from "../../repositories/auditLog.repository.js";
import {
  findPaymentById,
  findPaymentByReference,
  findPaymentsForAdmin,
} from "../../repositories/payment.repository.js";
import {
  findRefundsForAdmin,
  lockRefund,
  updateRefund,
} from "../../repositories/refund.repository.js";

const MINUTE_MS = 60 * 1000;

// Every payment attempt, newest first [AC-ADM-06].
// flagged=true: the ones that need a person (wrong amount, or still pending after 30 minutes)
export const listPaymentsForAdmin = async (query, now = new Date()) => {
  const { limit, offset } = toLimitAndOffset(query);
  const { rows, count } = await findPaymentsForAdmin({
    status: query.status,
    flaggedBefore: query.flagged
      ? new Date(now.getTime() - UNPAID_ORDER_MINUTES * MINUTE_MS)
      : null,
    search: query.q,
    limit,
    offset,
  });

  return { payments: rows, meta: buildPageMeta(query, count) };
};

// Ask Paystack again about one payment and record the answer, exactly like the webhook does
// [AC-ADM-06, AC-PAY-12]. A payment already settled answers ALREADY_PROCESSED and changes nothing.
// Audited, so it is clear who checked and what came back [AC-ADM-07].
export const reverifyPayment = async (admin, paymentId) => {
  const payment = await findPaymentById(paymentId);
  if (!payment) {
    throw new AppError(404, "NOT_FOUND", "Payment not found");
  }

  const statusBefore = payment.status;
  const outcome = await reconcilePayment(payment.reference);
  const after = await findPaymentByReference(payment.reference);

  await saveAuditLog({
    actorId: admin.id,
    action: "PAYMENT_REVERIFIED",
    targetType: "payment",
    targetId: payment.id,
    before: { status: statusBefore },
    after: { status: after.status, outcome },
    reason: null,
    ipAddress: admin.ipAddress,
  });

  return { outcome, payment: after };
};

// Every refund, newest first, optionally one status [AC-ADM-06]
export const listRefundsForAdmin = async (query) => {
  const { limit, offset } = toLimitAndOffset(query);
  const { rows, count } = await findRefundsForAdmin({ status: query.status, limit, offset });

  return { refunds: rows, meta: buildPageMeta(query, count) };
};

// A refund Paystack said FAILED: send it again as a new request [AC-ADM-06].
// Back to PENDING without the old Paystack id, so the refund job sends it afresh.
// Audited with the reason [AC-ADM-07, AC-ADM-08].
export const retryRefund = async (admin, refundId, reason) => {
  const refund = await sequelize.transaction(async (transaction) => {
    const locked = await lockRefund(refundId, transaction);
    if (!locked) {
      throw new AppError(404, "NOT_FOUND", "Refund not found");
    }
    if (locked.status !== "FAILED") {
      throw new AppError(409, "REFUND_NOT_FAILED", "Only a failed refund can be tried again");
    }

    const previousFailure = locked.failureReason;
    await updateRefund(
      locked,
      { status: "PENDING", providerRefundId: null, failureReason: null },
      transaction,
    );
    await saveAuditLog(
      {
        actorId: admin.id,
        action: "REFUND_RETRIED",
        targetType: "refund",
        targetId: locked.id,
        before: { status: "FAILED", failureReason: previousFailure },
        after: { status: "PENDING" },
        reason,
        ipAddress: admin.ipAddress,
      },
      transaction,
    );
    return locked;
  });

  // Sent by the refund job (and the 5-minute sweep catches it if this job is lost)
  await scheduleRefund(refund.id);
  return refund;
};
