import logger from "../../config/logger.js";
import { RESTAURANT_RESPONSE_MINUTES } from "../../jobs/enqueue.js";
import { rejectOrderWithRefund } from "./rejectOrder.service.js";
import {
  findOrderById,
  findPaidAt,
  findUnansweredPaidOrders,
} from "../../repositories/order.repository.js";

const SYSTEM = { userId: null, role: "SYSTEM" };
const BATCH_SIZE = 100;

const minutesBefore = (now, minutes) => new Date(now.getTime() - minutes * 60 * 1000);

// ─────────────────────────────────────────────
// Restaurant didn't answer in time: reject and refund [AC-RORD-04, AC-JOB-02, AC-JOB-03]
// ─────────────────────────────────────────────
export const rejectUnansweredOrder = async (orderId, now = new Date()) => {
  // Look first: nothing to do if the restaurant answered (or the customer cancelled) meanwhile
  const order = await findOrderById(orderId);
  if (!order || order.status !== "PAID") {
    return "ANSWERED";
  }

  // The 5 minutes count from payment, not from when the order was placed
  const paidAt = await findPaidAt(orderId);
  if (!paidAt || paidAt > minutesBefore(now, RESTAURANT_RESPONSE_MINUTES)) {
    return "NOT_DUE";
  }

  try {
    await rejectOrderWithRefund({
      orderId,
      actor: SYSTEM,
      reason: "RESTAURANT_TIMEOUT",
      isAllowedFor: () => true,
      // The owner may have tapped Accept a moment ago: then this must not reject
      onlyIfStatus: "PAID",
    });
    // The live event goes to the customer, the restaurant and the admins (changeOrderStatus).
    // SMS and email notices arrive with Step 12.
    logger.warn({ orderId }, "Restaurant did not answer in time: order rejected and refunded");
    return "REJECTED";
  } catch (error) {
    if (error.code === "INVALID_STATUS_TRANSITION") {
      return "ANSWERED";
    }
    throw error;
  }
};

// Safety net, every minute: catches unanswered orders even if their delayed job was lost
// (Redis restarted, or a crash right after payment) [plan review C1, C2]
export const sweepUnansweredOrders = async (now = new Date()) => {
  const overdue = await findUnansweredPaidOrders(
    minutesBefore(now, RESTAURANT_RESPONSE_MINUTES),
    BATCH_SIZE,
  );

  let rejected = 0;
  for (const order of overdue) {
    try {
      if ((await rejectUnansweredOrder(order.id, now)) === "REJECTED") {
        rejected += 1;
      }
    } catch (error) {
      // One bad order must not stop the others; the next sweep tries it again
      logger.error({ err: error, orderId: order.id }, "Could not reject unanswered order");
    }
  }

  return { checked: overdue.length, rejected };
};
