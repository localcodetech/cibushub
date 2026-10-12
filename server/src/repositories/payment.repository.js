import { Op } from "sequelize";
import { Order, Payment, User } from "../models/index.js";

// Admins: payments newest first [AC-ADM-06].
//   status: one status; flaggedBefore: only the flagged ones (AMOUNT_MISMATCH, or PENDING
//   since before that moment); search: a payment reference or an order number
export const findPaymentsForAdmin = ({ status, flaggedBefore, search, limit, offset }) => {
  const where = {};
  if (status) {
    where.status = status;
  }
  if (flaggedBefore) {
    where[Op.or] = [
      { status: "AMOUNT_MISMATCH" },
      { status: "PENDING", createdAt: { [Op.lte]: flaggedBefore } },
    ];
  }
  if (search) {
    where[Op.and] = [{ [Op.or]: [{ reference: search }, { "$order.order_number$": search }] }];
  }
  return Payment.findAndCountAll({
    where,
    include: [
      {
        model: Order,
        as: "order",
        attributes: ["id", "orderNumber", "totalPesewas", "status"],
        include: [{ model: User, as: "customer", attributes: ["fullName"], paranoid: false }],
      },
    ],
    order: [["createdAt", "DESC"]],
    limit,
    offset,
    distinct: true,
  });
};

export const findPaymentById = (paymentId) => {
  return Payment.findByPk(paymentId);
};

export const createPayment = (data) => {
  return Payment.create(data);
};

export const findPaymentByReference = (reference, transaction) => {
  return Payment.findOne({ where: { reference }, transaction });
};

// A payment started a moment ago for the same order is reused, so a double tap opens one checkout
export const findRecentPendingPayment = (orderId, since) => {
  return Payment.findOne({
    where: { orderId, status: "PENDING", createdAt: { [Op.gte]: since } },
    order: [["createdAt", "DESC"]],
  });
};

export const findPaymentsForOrder = (orderId) => {
  return Payment.findAll({ where: { orderId }, order: [["createdAt", "ASC"]] });
};

export const updatePayment = (payment, changes, transaction) => {
  return payment.update(changes, { transaction });
};

// Locks one payment until the transaction ends, so a duplicate webhook waits, then sees it done [AC-PAY-07]
export const lockPaymentByReference = (reference, transaction) => {
  return Payment.findOne({ where: { reference }, lock: transaction.LOCK.UPDATE, transaction });
};

export const findPendingPaymentsForOrder = (orderId) => {
  return Payment.findAll({ where: { orderId, status: "PENDING" } });
};

// Payments still PENDING that were started before a moment: their webhook may have been missed
export const findStuckPendingPayments = (startedBefore, limit) => {
  return Payment.findAll({
    where: { status: "PENDING", createdAt: { [Op.lt]: startedBefore } },
    order: [["createdAt", "ASC"]],
    limit,
  });
};

// The payment that actually took the customer's money
export const findSuccessfulPayment = (orderId, transaction) => {
  return Payment.findOne({ where: { orderId, status: "SUCCESS" }, transaction });
};
