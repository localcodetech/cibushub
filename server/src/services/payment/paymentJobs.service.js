import logger from "../../config/logger.js";
import { UNPAID_ORDER_MINUTES } from "../../jobs/enqueue.js";
import { changeOrderStatus } from "../order/changeOrderStatus.service.js";
import { reconcilePayment } from "./paystackWebhook.service.js";
import { deleteExpiredTokens } from "../../repositories/refreshToken.repository.js";
import { findOrderById, findOverdueUnpaidOrders } from "../../repositories/order.repository.js";
import {
  findPendingPaymentsForOrder,
  findStuckPendingPayments,
} from "../../repositories/payment.repository.js";

const SYSTEM = { userId: null, role: "SYSTEM" };
const RECONCILE_AFTER_MINUTES = 10;
const BATCH_SIZE = 100;

const minutesBefore = (now, minutes) => new Date(now.getTime() - minutes * 60 * 1000);

// ─────────────────────────────────────────────
// Unpaid order expiry [AC-PAY-11, AC-JOB-02, AC-JOB-03]
// ─────────────────────────────────────────────
export const expireUnpaidOrder = async (orderId, now = new Date()) => {
  // Look first: the job does nothing if the order was paid or cancelled in the meantime
  const order = await findOrderById(orderId);

  if (!order || order.status !== "PENDING_PAYMENT") {
    return "NOT_PENDING";
  }
  if (order.createdAt > minutesBefore(now, UNPAID_ORDER_MINUTES)) {
    return "NOT_DUE";
  }

  // Last check with Paystack before cancelling: the customer may have paid and the webhook got lost.
  // If Paystack cannot be reached this throws, and the job tries again later instead of guessing.
  const pendingPayments = await findPendingPaymentsForOrder(order.id);
  for (const payment of pendingPayments) {
    await reconcilePayment(payment.reference);
  }

  try {
    await changeOrderStatus({
      orderId: order.id,
      toStatus: "CANCELLED",
      actor: SYSTEM,
      reason: "PAYMENT_TIMEOUT",
      isAllowedFor: () => true,
      // Paid a moment ago (by the check above or a webhook) must never be cancelled here
      onlyIfStatus: "PENDING_PAYMENT",
    });
    return "EXPIRED";
  } catch (error) {
    // It changed while we were checking: nothing to do
    if (error.code === "INVALID_STATUS_TRANSITION") {
      return "NOT_PENDING";
    }
    throw error;
  }
};

// Safety net, every minute: finds overdue unpaid orders even if Redis lost their delayed job [plan review C2]
export const sweepUnpaidOrders = async (now = new Date()) => {
  const overdue = await findOverdueUnpaidOrders(
    minutesBefore(now, UNPAID_ORDER_MINUTES),
    BATCH_SIZE,
  );

  let expired = 0;
  for (const order of overdue) {
    try {
      if ((await expireUnpaidOrder(order.id, now)) === "EXPIRED") {
        expired += 1;
      }
    } catch (error) {
      // One bad order must not stop the others; the next sweep tries it again
      logger.error({ err: error, orderId: order.id }, "Could not expire unpaid order");
    }
  }

  return { checked: overdue.length, expired };
};

// ─────────────────────────────────────────────
// Payment reconciliation, every 10 minutes [AC-PAY-12, AC-JOB-02]
// ─────────────────────────────────────────────
export const reconcileStuckPayments = async (now = new Date()) => {
  const stuck = await findStuckPendingPayments(
    minutesBefore(now, RECONCILE_AFTER_MINUTES),
    BATCH_SIZE,
  );

  const outcomes = {};
  for (const payment of stuck) {
    try {
      const outcome = await reconcilePayment(payment.reference);
      outcomes[outcome] = (outcomes[outcome] || 0) + 1;
    } catch (error) {
      logger.error({ err: error, reference: payment.reference }, "Could not reconcile payment");
    }
  }

  return { checked: stuck.length, outcomes };
};

// ─────────────────────────────────────────────
// Expired login session clean-up, daily [AC-JOB-02]
// ─────────────────────────────────────────────
export const cleanupExpiredTokens = async (now = new Date()) => {
  const deleted = await deleteExpiredTokens(now);
  return { deleted };
};
