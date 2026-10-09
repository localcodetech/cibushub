import AppError from "../../utils/AppError.js";
import { buildPageMeta, toLimitAndOffset } from "../../utils/pagination.js";
import { nextStatusesFor } from "../../utils/order/orderStateMachine.js";
import sequelize from "../../config/database.js";
import { retryOnDeadlock } from "../../utils/database/retryOnDeadlock.js";
import { scheduleRefund } from "../../jobs/enqueue.js";
import { changeOrderStatus } from "./changeOrderStatus.service.js";
import { refundableAmount, requestRefund } from "../refund/requestRefund.service.js";
import { findOrderWithDetails, findOrdersByCustomer } from "../../repositories/order.repository.js";
import { findRestaurantById } from "../../repositories/restaurant.repository.js";

// [AC-CUST-09]
export const listMyOrders = async (customerId, query) => {
  const { limit, offset } = toLimitAndOffset(query);

  const { rows, count } = await findOrdersByCustomer({
    customerId,
    status: query.status,
    limit,
    offset,
  });

  return { orders: rows, meta: buildPageMeta(query, count) };
};

// One order with its timeline: every status reached, with the time [AC-ORD-06]
export const getMyOrder = async (customerId, orderId) => {
  const order = await findOrderWithDetails(orderId);

  if (!order || order.customerId !== customerId) {
    throw new AppError(404, "NOT_FOUND", "Order not found");
  }

  const timeline = order.statusHistory.map((entry) => ({
    status: entry.toStatus,
    at: entry.createdAt,
    reason: entry.reason,
  }));

  // Who to call about this order; the customer already saw these on the restaurant page
  const restaurant = await findRestaurantById(order.restaurantId);

  return {
    ...order.toJSON(),
    restaurant: { id: restaurant.id, name: restaurant.name, phone: restaurant.phone },
    timeline,
    // e.g. ["CANCELLED"] before the restaurant accepts, [] after: the app shows the right buttons
    customerActions: nextStatusesFor(order.status, "CUSTOMER"),
  };
};

// Only before the restaurant accepts; the state machine refuses later ones [AC-CANC-01, AC-CANC-02]
// If it was paid, a full refund is written in the SAME transaction: cancelled always means refunded
export const cancelMyOrder = async (customerId, orderId, reason) => {
  const actor = { userId: customerId, role: "CUSTOMER" };

  const refund = await retryOnDeadlock(() =>
    sequelize.transaction(async (transaction) => {
      const order = await changeOrderStatus({
        orderId,
        toStatus: "CANCELLED",
        actor,
        reason,
        isAllowedFor: (found) => found.customerId === customerId,
        transaction,
      });

      const amountPesewas = await refundableAmount(order, transaction);
      if (amountPesewas === 0) {
        return null; // never paid: nothing to give back
      }

      return requestRefund({ order, amountPesewas, reason, actor, transaction });
    }),
  );

  // Send it to Paystack now (the every-5-minutes sweep is the safety net)
  if (refund) {
    await scheduleRefund(refund.id);
  }

  return getMyOrder(customerId, orderId);
};
