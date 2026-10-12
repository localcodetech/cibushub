import { Op } from "sequelize";
import {
  Delivery,
  NotificationLog,
  Order,
  OrderStatusHistory,
  Payment,
  Refund,
  Restaurant,
  RiderProfile,
} from "../models/index.js";

// The numbers on the admin dashboard [AC-ADM-01]. Each is one COUNT or SUM in MySQL.

// Orders that became PAID since a moment, and what they add up to (GMV)
export const sumOrdersPaidSince = async (since) => {
  const paidEntries = await OrderStatusHistory.findAll({
    where: { toStatus: "PAID", createdAt: { [Op.gte]: since } },
    attributes: ["orderId"],
  });
  const orderIds = paidEntries.map((entry) => entry.orderId);
  if (orderIds.length === 0) {
    return { count: 0, totalPesewas: 0 };
  }
  const totalPesewas = await Order.sum("totalPesewas", { where: { id: orderIds } });
  return { count: orderIds.length, totalPesewas: totalPesewas || 0 };
};

// { PAID: 3, ACCEPTED: 1, ... } for the given statuses (0 when none)
export const countOrdersByStatus = async (statuses) => {
  const rows = await Order.count({ where: { status: statuses }, group: ["status"] });
  const counts = Object.fromEntries(statuses.map((status) => [status, 0]));
  for (const row of rows) {
    counts[row.status] = row.count;
  }
  return counts;
};

export const countOnlineRiders = () => {
  return RiderProfile.count({ where: { isOnline: true } });
};

export const countPendingRestaurants = () => {
  return Restaurant.count({ where: { status: "PENDING_APPROVAL" } });
};

export const countPendingRiders = () => {
  return RiderProfile.count({ where: { status: "PENDING_APPROVAL" } });
};

// Still looking for a rider since before a moment (e.g. 10 minutes ago)
export const countSearchingSince = (before) => {
  return Delivery.count({ where: { status: "SEARCHING", searchStartedAt: { [Op.lte]: before } } });
};

export const countPaymentsWithStatus = (status, createdBefore) => {
  const where = { status };
  if (createdBefore) {
    where.createdAt = { [Op.lte]: createdBefore };
  }
  return Payment.count({ where });
};

export const countRefundsWithStatus = (status) => {
  return Refund.count({ where: { status } });
};

export const countFailedNotificationsSince = (since) => {
  return NotificationLog.count({ where: { status: "FAILED", updatedAt: { [Op.gte]: since } } });
};
