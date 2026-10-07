import { Order, OrderItem, OrderItemOption, OrderStatusHistory } from "../models/index.js";

// An order with its frozen items, their options, and its status history in time order
const WITH_DETAILS = {
  include: [
    {
      model: OrderItem,
      as: "items",
      include: [{ model: OrderItemOption, as: "options" }],
    },
    { model: OrderStatusHistory, as: "statusHistory" },
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
