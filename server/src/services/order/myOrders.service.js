import AppError from "../../utils/AppError.js";
import { buildPageMeta, toLimitAndOffset } from "../../utils/pagination.js";
import { nextStatusesFor } from "../../utils/order/orderStateMachine.js";
import { changeOrderStatus } from "./changeOrderStatus.service.js";
import { findOrderWithDetails, findOrdersByCustomer } from "../../repositories/order.repository.js";

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

  return {
    ...order.toJSON(),
    timeline,
    // e.g. ["CANCELLED"] before the restaurant accepts, [] after: the app shows the right buttons
    customerActions: nextStatusesFor(order.status, "CUSTOMER"),
  };
};

// Only before the restaurant accepts; the state machine refuses later ones [AC-CANC-01, AC-CANC-02]
// A paid order's refund starts here once payments are built (Step 9)
export const cancelMyOrder = async (customerId, orderId, reason) => {
  await changeOrderStatus({
    orderId,
    toStatus: "CANCELLED",
    actor: { userId: customerId, role: "CUSTOMER" },
    reason,
    isAllowedFor: (order) => order.customerId === customerId,
  });

  return getMyOrder(customerId, orderId);
};
