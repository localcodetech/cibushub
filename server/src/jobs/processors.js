import {
  cleanupExpiredTokens,
  expireUnpaidOrder,
  reconcileStuckPayments,
  sweepUnpaidOrders,
} from "../services/payment/paymentJobs.service.js";
import { processPendingRefunds, processRefund } from "../services/refund/processRefund.service.js";
import {
  rejectUnansweredOrder,
  sweepUnansweredOrders,
} from "../services/order/restaurantTimeout.service.js";
import { sweepStaleRiders } from "../services/rider/riderPresence.service.js";

// Job name → what it does. Each one re-checks the current state before acting [AC-JOB-03]
export const PROCESSORS = {
  expireUnpaidOrder: (job) => expireUnpaidOrder(job.data.orderId),
  sweepUnpaidOrders: () => sweepUnpaidOrders(),
  reconcilePayments: () => reconcileStuckPayments(),
  cleanupExpiredTokens: () => cleanupExpiredTokens(),
  processRefund: (job) => processRefund(job.data.refundId),
  processPendingRefunds: () => processPendingRefunds(),
  rejectUnansweredOrder: (job) => rejectUnansweredOrder(job.data.orderId),
  sweepUnansweredOrders: () => sweepUnansweredOrders(),
  sweepStaleRiders: () => sweepStaleRiders(),
};

// One function for every queue: find the job's processor by its name
export const runJob = async (job) => {
  const processor = PROCESSORS[job.name];

  if (!processor) {
    throw new Error(`No processor for job "${job.name}"`);
  }

  return processor(job);
};
