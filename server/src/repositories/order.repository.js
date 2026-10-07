import { Op } from "sequelize";
import {
  Order,
  OrderItem,
  OrderItemOption,
  OrderStatusHistory,
  Refund,
  Restaurant,
} from "../models/index.js";

// An order with its frozen items, their options, and its status history in time order
const WITH_DETAILS = {
  include: [
    {
      model: OrderItem,
      as: "items",
      include: [{ model: OrderItemOption, as: "options" }],
    },
    { model: OrderStatusHistory, as: "statusHistory" },
    {
      model: Refund,
      as: "refunds",
      attributes: ["id", "amountPesewas", "status", "reason", "createdAt", "processedAt"],
    },
  ],
  order: [[{ model: OrderStatusHistory, as: "statusHistory" }, "createdAt", "ASC"]],
};

export const findOrderByIdempotencyKey = (customerId, idempotencyKey) => {
  return Order.findOne({ where: { customerId, idempotencyKey }, ...WITH_DETAILS });
};

export const findOrderWithDetails = (orderId) => {
  return Order.findByPk(orderId, WITH_DETAILS);
};

// The order and all its items and options, saved in one go
export const createOrderWithItems = (data, transaction) => {
  return Order.create(data, {
    include: [
      { model: OrderItem, as: "items", include: [{ model: OrderItemOption, as: "options" }] },
    ],
    transaction,
  });
};

export const addStatusHistory = (data, transaction) => {
  return OrderStatusHistory.create(data, { transaction });
};

// One page of a customer's orders, newest first, with the restaurant's name and logo [AC-CUST-09]
export const findOrdersByCustomer = ({ customerId, status, limit, offset }) => {
  const where = { customerId };
  if (status) {
    where.status = status;
  }

  return Order.findAndCountAll({
    where,
    include: [{ model: Restaurant, as: "restaurant", attributes: ["id", "name", "logoUrl"] }],
    order: [["createdAt", "DESC"]],
    limit,
    offset,
  });
};

// Locks one order row until the transaction ends, so two people cannot change it at once [AC-ORD-05]
export const lockOrder = (orderId, transaction) => {
  return Order.findByPk(orderId, { lock: transaction.LOCK.UPDATE, transaction });
};

export const updateOrder = (order, changes, transaction) => {
  return order.update(changes, { transaction });
};

export const findOrderItems = (orderId, transaction) => {
  return OrderItem.findAll({ where: { orderId }, transaction });
};

export const findOrderById = (orderId) => {
  return Order.findByPk(orderId);
};

// Orders still waiting for payment that were placed before a moment, oldest first (the sweeper)
export const findOverdueUnpaidOrders = (placedBefore, limit) => {
  return Order.findAll({
    where: { status: "PENDING_PAYMENT", createdAt: { [Op.lt]: placedBefore } },
    attributes: ["id"],
    order: [["createdAt", "ASC"]],
    limit,
  });
};
