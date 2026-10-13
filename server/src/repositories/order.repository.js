import { Op, col, fn } from "sequelize";
import {
  Order,
  OrderItem,
  OrderItemOption,
  OrderStatusHistory,
  Payment,
  Refund,
  Restaurant,
  User,
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

// ── Restaurant owner views [AC-RORD-02, AC-RORD-06, AC-RORD-07] ──

// What the kitchen needs: items, options, history (for "paid at"), with the money split
const FOR_KITCHEN = {
  include: [
    { model: OrderItem, as: "items", include: [{ model: OrderItemOption, as: "options" }] },
    { model: OrderStatusHistory, as: "statusHistory" },
    {
      model: Restaurant,
      as: "restaurant",
      // Its position: how far away the rider is [AC-RORD-08]
      attributes: ["id", "name", "prepTimeMinutes", "latitude", "longitude"],
    },
    // Only the name: the kitchen never gets the customer's phone or address [AC-RORD-02]
    { model: User, as: "customer", attributes: ["fullName"], paranoid: false },
  ],
};

// Orders of these restaurants in these statuses, oldest first (the board), at most `limit`
export const findRestaurantOrdersByStatus = ({ restaurantIds, statuses, limit }) => {
  return Order.scope("withEarnings").findAll({
    where: { restaurantId: { [Op.in]: restaurantIds }, status: { [Op.in]: statuses } },
    ...FOR_KITCHEN,
    order: [
      ["createdAt", "ASC"],
      [{ model: OrderStatusHistory, as: "statusHistory" }, "createdAt", "ASC"],
    ],
    limit,
  });
};

// One order with everything the kitchen needs (the service checks it is theirs)
export const findOrderForKitchen = (orderId) => {
  return Order.scope("withEarnings").findByPk(orderId, {
    ...FOR_KITCHEN,
    order: [[{ model: OrderStatusHistory, as: "statusHistory" }, "createdAt", "ASC"]],
  });
};

// Orders the restaurant ever saw: never paid ones (still waiting, or cancelled before
// payment) never reached the kitchen, so they stay out of its history and totals
const REACHED_THE_KITCHEN = {
  status: { [Op.ne]: "PENDING_PAYMENT" },
  [Op.not]: { status: "CANCELLED", paymentStatus: "UNPAID" },
};

// Past and present orders for the history page, newest first, one page at a time
export const findRestaurantOrderHistory = ({ restaurantIds, status, from, to, limit, offset }) => {
  const where = {
    restaurantId: { [Op.in]: restaurantIds },
    createdAt: { [Op.gte]: from, [Op.lt]: to },
    [Op.and]: [REACHED_THE_KITCHEN, status ? { status } : {}],
  };

  return Order.scope("withEarnings").findAndCountAll({
    where,
    include: [{ model: Restaurant, as: "restaurant", attributes: ["id", "name"] }],
    order: [["createdAt", "DESC"]],
    limit,
    offset,
    distinct: true,
  });
};

// How many orders per status, and the money, for these restaurants between two moments
export const summariseRestaurantOrders = ({ restaurantIds, from, to }) => {
  return Order.scope("withEarnings").findAll({
    where: {
      restaurantId: { [Op.in]: restaurantIds },
      createdAt: { [Op.gte]: from, [Op.lt]: to },
      ...REACHED_THE_KITCHEN,
    },
    attributes: [
      "status",
      [Order.sequelize.fn("COUNT", Order.sequelize.col("id")), "orderCount"],
      [Order.sequelize.fn("SUM", Order.sequelize.col("subtotal_pesewas")), "salesPesewas"],
      [
        Order.sequelize.fn("SUM", Order.sequelize.col("restaurant_earnings_pesewas")),
        "earningsPesewas",
      ],
    ],
    group: ["status"],
    raw: true,
  });
};

// When the order became PAID (from its history), or null
export const findPaidAt = async (orderId) => {
  const entry = await OrderStatusHistory.findOne({
    where: { orderId, toStatus: "PAID" },
    order: [["createdAt", "ASC"]],
  });
  return entry ? entry.createdAt : null;
};

// ─────────────────────────────────────────────
// Admins: every order [AC-ADM-05]
// ─────────────────────────────────────────────

// "50%_off" -> "50\%\_off": typed % and _ are plain letters in LIKE
const likeText = (text) => `%${text.replace(/[%_\\]/g, "\\$&")}%`;

// One page of orders, newest first, with the customer and restaurant.
//   search: part of an order number or restaurant name, or a phone (already in +233 form)
//   from, to: Date limits on when the order was placed
export const findOrdersForAdmin = ({
  search,
  phone,
  status,
  from,
  to,
  restaurantId,
  limit,
  offset,
}) => {
  const where = {};
  if (status) {
    where.status = status;
  }
  if (restaurantId) {
    where.restaurantId = restaurantId;
  }
  if (from || to) {
    where.createdAt = {};
    if (from) {
      where.createdAt[Op.gte] = from;
    }
    if (to) {
      where.createdAt[Op.lt] = to;
    }
  }
  if (search) {
    // "$customer.phone$" means: the phone column of the joined customer
    const anyOf = [
      { orderNumber: { [Op.like]: likeText(search) } },
      { "$restaurant.name$": { [Op.like]: likeText(search) } },
    ];
    if (phone) {
      anyOf.push({ contactPhone: phone }, { "$customer.phone$": phone });
    }
    where[Op.or] = anyOf;
  }

  return Order.findAndCountAll({
    where,
    include: [
      { model: User, as: "customer", attributes: ["id", "fullName", "phone"], paranoid: false },
      { model: Restaurant, as: "restaurant", attributes: ["id", "name"], paranoid: false },
    ],
    order: [["createdAt", "DESC"]],
    limit,
    offset,
    // Count orders, not joined rows
    distinct: true,
  });
};

// Everything about one order, for admins: items, timeline (who did what), payments and
// refunds, customer, restaurant, and the earnings split
export const findOrderForAdmin = (orderId) => {
  return Order.scope("withEarnings").findByPk(orderId, {
    include: [
      ...WITH_DETAILS.include.filter((part) => part.as !== "statusHistory"),
      {
        model: OrderStatusHistory,
        as: "statusHistory",
        include: [{ model: User, as: "actor", attributes: ["id", "fullName"], paranoid: false }],
      },
      { model: Payment, as: "payments" },
      {
        model: User,
        as: "customer",
        attributes: ["id", "fullName", "phone", "email"],
        paranoid: false,
      },
      {
        model: Restaurant,
        as: "restaurant",
        attributes: ["id", "name", "phone", "addressLine", "area", "latitude", "longitude"],
        paranoid: false,
      },
    ],
    order: WITH_DETAILS.order,
  });
};

// How many orders a customer has placed (paid or later), for admins
export const countCustomerOrders = (customerId) => {
  return Order.count({ where: { customerId, status: { [Op.ne]: "PENDING_PAYMENT" } } });
};

// ─────────────────────────────────────────────
// One restaurant's performance, for admins [AC-ADM-03]
// ─────────────────────────────────────────────

// { DELIVERED: 12, REJECTED: 1, ... } for orders placed since a moment (unpaid ones left out)
export const countRestaurantOrdersByStatus = async (restaurantId, since) => {
  const rows = await Order.count({
    where: {
      restaurantId,
      createdAt: { [Op.gte]: since },
      status: { [Op.ne]: "PENDING_PAYMENT" },
    },
    group: ["status"],
  });
  return Object.fromEntries(rows.map((row) => [row.status, row.count]));
};

// What delivered orders added up to since a moment
export const sumDeliveredOrders = async (restaurantId, since) => {
  const total = await Order.sum("totalPesewas", {
    where: { restaurantId, status: "DELIVERED", createdAt: { [Op.gte]: since } },
  });
  return total || 0;
};

// The newest orders (paid or later), for a quick look
export const findRecentRestaurantOrders = (restaurantId, limit) => {
  return Order.findAll({
    where: { restaurantId, status: { [Op.ne]: "PENDING_PAYMENT" } },
    attributes: ["id", "orderNumber", "status", "totalPesewas", "createdAt"],
    order: [["createdAt", "DESC"]],
    limit,
  });
};

// When the order was DELIVERED (from its history), or null
export const findDeliveredAt = async (orderId) => {
  const entry = await OrderStatusHistory.findOne({
    where: { orderId, toStatus: "DELIVERED" },
    order: [["createdAt", "ASC"]],
  });
  return entry ? entry.createdAt : null;
};

// PAID orders the restaurant still hasn't answered, paid before a moment (the timeout sweeper)
export const findUnansweredPaidOrders = (paidBefore, limit) => {
  return Order.findAll({
    where: { status: "PAID" },
    attributes: ["id"],
    include: [
      {
        model: OrderStatusHistory,
        as: "statusHistory",
        attributes: [],
        where: { toStatus: "PAID", createdAt: { [Op.lt]: paidBefore } },
        required: true,
      },
    ],
    order: [["createdAt", "ASC"]],
    limit,
    subQuery: false,
  });
};

// When each of these restaurants last had a paid order: { restaurantId: Date }.
// One grouped query; restaurants with no paid orders are left out.
export const findLastPaidOrderTimes = async (restaurantIds) => {
  if (restaurantIds.length === 0) return {};
  const rows = await Order.findAll({
    attributes: ["restaurantId", [fn("MAX", col("created_at")), "lastOrderAt"]],
    where: { restaurantId: restaurantIds, paymentStatus: { [Op.ne]: "UNPAID" } },
    group: ["restaurantId"],
    raw: true,
  });
  return Object.fromEntries(rows.map((row) => [row.restaurantId, row.lastOrderAt]));
};
