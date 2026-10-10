import sequelize from "../../config/database.js";
import AppError from "../../utils/AppError.js";
import { retryOnDeadlock } from "../../utils/database/retryOnDeadlock.js";
import { buildPageMeta, toLimitAndOffset } from "../../utils/pagination.js";
import { nextStatusesFor } from "../../utils/order/orderStateMachine.js";
import { scheduleRefund } from "../../jobs/enqueue.js";
import { changeOrderStatus } from "./changeOrderStatus.service.js";
import { refundableAmount, requestRefund } from "../refund/requestRefund.service.js";
import { findRestaurantsByOwner } from "../../repositories/restaurant.repository.js";
import {
  findOrderById,
  findOrderForKitchen,
  findRestaurantOrderHistory,
  findRestaurantOrdersByStatus,
  summariseRestaurantOrders,
} from "../../repositories/order.repository.js";

// The orders a kitchen is still working on: from "paid, waiting for you" to "on the way"
export const ACTIVE_STATUSES = [
  "PAID",
  "ACCEPTED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "RIDER_ASSIGNED",
  "PICKED_UP",
];
const BOARD_LIMIT = 200;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// The owner's restaurants, or just one of them. Someone else's restaurant looks like none.
const getOwnedRestaurants = async (ownerId, restaurantId) => {
  const restaurants = await findRestaurantsByOwner(ownerId);

  if (!restaurantId) {
    return restaurants;
  }
  const one = restaurants.filter((restaurant) => restaurant.id === restaurantId);
  if (one.length === 0) {
    throw new AppError(404, "NOT_FOUND", "Restaurant not found");
  }
  return one;
};

const idsOf = (restaurants) => restaurants.map((restaurant) => restaurant.id);

// "Ama Mensah" -> "Ama": enough to call out an order, without sharing more [AC-RORD-02]
const firstNameOf = (fullName) => (fullName || "").trim().split(/\s+/)[0] || "Customer";

// What the kitchen sees. Never the customer's phone or address: the rider handles delivery
// [AC-RORD-02]. The money shown is the restaurant's own (subtotal and its earnings).
const toKitchenOrder = (order) => {
  const paidEntry = (order.statusHistory || []).find((entry) => entry.toStatus === "PAID");

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    restaurant: order.restaurant ? { id: order.restaurant.id, name: order.restaurant.name } : null,
    customerFirstName: firstNameOf(order.customer?.fullName),
    placedAt: order.createdAt,
    paidAt: paidEntry ? paidEntry.createdAt : null,
    estimatedReadyAt: order.estimatedReadyAt,
    restaurantNote: order.restaurantNote,
    items: (order.items || []).map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      options: item.options.map((option) => ({ groupName: option.groupName, name: option.name })),
      lineTotalPesewas: item.lineTotalPesewas,
    })),
    subtotalPesewas: order.subtotalPesewas,
    restaurantEarningsPesewas: order.restaurantEarningsPesewas,
    cancellationReason: order.cancellationReason,
    // e.g. ["ACCEPTED", "REJECTED"] for a new order: the dashboard shows those buttons
    ownerActions: nextStatusesFor(order.status, "RESTAURANT_OWNER"),
  };
};

// The board: every order still in the kitchen, oldest first [AC-RORD-06]
export const listOwnerBoard = async (ownerId, { restaurantId }) => {
  const restaurants = await getOwnedRestaurants(ownerId, restaurantId);
  if (restaurants.length === 0) {
    return [];
  }

  const orders = await findRestaurantOrdersByStatus({
    restaurantIds: idsOf(restaurants),
    statuses: ACTIVE_STATUSES,
    limit: BOARD_LIMIT,
  });

  return orders.map(toKitchenOrder);
};

// One order of one of my restaurants (anyone else's looks like it doesn't exist)
export const getOwnerOrder = async (ownerId, orderId) => {
  const restaurants = await getOwnedRestaurants(ownerId);
  const order = await findOrderForKitchen(orderId);

  if (!order || !idsOf(restaurants).includes(order.restaurantId)) {
    throw new AppError(404, "NOT_FOUND", "Order not found");
  }

  return toKitchenOrder(order);
};

// The owner moves one of their orders on. The state machine decides what is allowed when.
const moveOrder = async (ownerId, orderId, toStatus, extra = {}) => {
  const restaurantIds = idsOf(await getOwnedRestaurants(ownerId));

  await changeOrderStatus({
    orderId,
    toStatus,
    actor: { userId: ownerId, role: "RESTAURANT_OWNER" },
    reason: extra.reason,
    extraChanges: extra.changes,
    isAllowedFor: (order) => restaurantIds.includes(order.restaurantId),
    transaction: extra.transaction,
  });
};

// Accept: the customer is told when to expect it [AC-RORD-03].
// prepTimeMinutes is optional; the restaurant's usual preparation time is used otherwise.
export const acceptOrder = async (ownerId, orderId, prepTimeMinutes) => {
  const restaurants = await getOwnedRestaurants(ownerId);
  const order = await findOrderById(orderId);
  const restaurant = order && restaurants.find((owned) => owned.id === order.restaurantId);
  if (!restaurant) {
    throw new AppError(404, "NOT_FOUND", "Order not found");
  }

  const minutes = prepTimeMinutes ?? restaurant.prepTimeMinutes;
  const estimatedReadyAt = new Date(Date.now() + minutes * 60 * 1000);

  await moveOrder(ownerId, orderId, "ACCEPTED", { changes: { estimatedReadyAt } });
  return getOwnerOrder(ownerId, orderId);
};

// Reject with a reason. A paid order is refunded in full, in the SAME transaction,
// so "rejected" always means "money on its way back" [AC-RORD-03, AC-CANC-04]
export const rejectOrder = async (ownerId, orderId, reason) => {
  const restaurantIds = idsOf(await getOwnedRestaurants(ownerId));
  const actor = { userId: ownerId, role: "RESTAURANT_OWNER" };

  const refund = await retryOnDeadlock(() =>
    sequelize.transaction(async (transaction) => {
      const order = await changeOrderStatus({
        orderId,
        toStatus: "REJECTED",
        actor,
        reason,
        isAllowedFor: (found) => restaurantIds.includes(found.restaurantId),
        transaction,
      });

      const amountPesewas = await refundableAmount(order, transaction);
      if (amountPesewas === 0) {
        return null;
      }
      return requestRefund({ order, amountPesewas, reason, actor, transaction });
    }),
  );

  // Send it to Paystack now (the every-5-minutes sweep is the safety net)
  if (refund) {
    await scheduleRefund(refund.id);
  }

  return getOwnerOrder(ownerId, orderId);
};

// One tap each: "Start preparing", "Ready for pickup" [AC-RORD-05]
export const startPreparing = async (ownerId, orderId) => {
  await moveOrder(ownerId, orderId, "PREPARING");
  return getOwnerOrder(ownerId, orderId);
};

export const markReady = async (ownerId, orderId) => {
  await moveOrder(ownerId, orderId, "READY_FOR_PICKUP");
  return getOwnerOrder(ownerId, orderId);
};

// "2026-10-10" -> that whole day in Ghana time. Ghana is on UTC all year, so midnight UTC.
const dayRange = (fromDay, toDay) => {
  const from = new Date(fromDay + "T00:00:00Z");
  const to = new Date(new Date(toDay + "T00:00:00Z").getTime() + ONE_DAY_MS);
  return { from, to };
};

// Today in Ghana as "YYYY-MM-DD"
const todayInGhana = () => new Date().toISOString().slice(0, 10);

// Past orders by day range and status, newest first [AC-RORD-07]
export const listOwnerHistory = async (ownerId, query) => {
  const restaurants = await getOwnedRestaurants(ownerId, query.restaurantId);
  const { limit, offset } = toLimitAndOffset(query);
  const fromDay = query.from || todayInGhana();
  const { from, to } = dayRange(fromDay, query.to || fromDay);

  if (restaurants.length === 0) {
    return { orders: [], meta: buildPageMeta(query, 0) };
  }

  const { rows, count } = await findRestaurantOrderHistory({
    restaurantIds: idsOf(restaurants),
    status: query.status,
    from,
    to,
    limit,
    offset,
  });

  const orders = rows.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    restaurant: { id: order.restaurant.id, name: order.restaurant.name },
    placedAt: order.createdAt,
    subtotalPesewas: order.subtotalPesewas,
    restaurantEarningsPesewas: order.restaurantEarningsPesewas,
  }));

  return { orders, meta: buildPageMeta(query, count) };
};

// The day in numbers: orders per status, and the money from orders that went ahead [AC-RORD-07].
// Rejected and cancelled orders are counted but earn nothing (they were refunded).
export const getOwnerDailySummary = async (ownerId, query) => {
  const restaurants = await getOwnedRestaurants(ownerId, query.restaurantId);
  const day = query.date || todayInGhana();
  const { from, to } = dayRange(day, day);

  const byStatus = {};
  let orderCount = 0;
  let salesPesewas = 0;
  let earningsPesewas = 0;

  if (restaurants.length > 0) {
    const rows = await summariseRestaurantOrders({ restaurantIds: idsOf(restaurants), from, to });
    for (const row of rows) {
      const count = Number(row.orderCount);
      byStatus[row.status] = count;
      orderCount += count;
      if (row.status !== "REJECTED" && row.status !== "CANCELLED") {
        salesPesewas += Number(row.salesPesewas || 0);
        earningsPesewas += Number(row.earningsPesewas || 0);
      }
    }
  }

  return { date: day, orderCount, byStatus, salesPesewas, earningsPesewas };
};
