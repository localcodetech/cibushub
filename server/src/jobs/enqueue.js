import logger from "../config/logger.js";
import { QUEUE_NAMES, getQueue } from "./queues.js";

export const UNPAID_ORDER_MINUTES = 30;
// How long a restaurant has to accept a paid order before it is rejected and refunded [AC-RORD-04]
export const RESTAURANT_RESPONSE_MINUTES = 5;

// Cancel the order in 30 minutes if it is still unpaid [AC-PAY-11, AC-JOB-02]
// If Redis is down the order is still saved: the every-minute sweeper will expire it instead.
export const scheduleUnpaidOrderExpiry = async (orderId) => {
  try {
    await getQueue(QUEUE_NAMES.payments).add(
      "expireUnpaidOrder",
      { orderId },
      // The job id makes it impossible to schedule the same expiry twice
      { delay: UNPAID_ORDER_MINUTES * 60 * 1000, jobId: `expire-unpaid-${orderId}` },
    );
  } catch (error) {
    logger.error(
      { err: error, orderId },
      "Could not schedule unpaid-order expiry; the sweeper will catch it",
    );
  }
};

// Send a refund to Paystack right away. If this fails, the every-5-minutes refund sweep sends it.
export const scheduleRefund = async (refundId) => {
  try {
    await getQueue(QUEUE_NAMES.payments).add(
      "processRefund",
      { refundId },
      { jobId: `refund-${refundId}` },
    );
  } catch (error) {
    logger.error(
      { err: error, refundId },
      "Could not schedule refund; the refund sweep will send it",
    );
  }
};

// Reject and refund in 5 minutes if the restaurant hasn't answered [AC-RORD-04, AC-JOB-02]
// If Redis is down the order is still saved: the every-minute sweeper catches it instead.
export const scheduleRestaurantTimeout = async (orderId) => {
  try {
    await getQueue(QUEUE_NAMES.payments).add(
      "rejectUnansweredOrder",
      { orderId },
      {
        delay: RESTAURANT_RESPONSE_MINUTES * 60 * 1000,
        jobId: `restaurant-timeout-${orderId}`,
      },
    );
  } catch (error) {
    logger.error(
      { err: error, orderId },
      "Could not schedule restaurant timeout; the sweeper will catch it",
    );
  }
};
