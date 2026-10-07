import { Op } from "sequelize";
import { Payment } from "../models/index.js";

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
