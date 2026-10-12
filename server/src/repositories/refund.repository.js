import { Op } from "sequelize";
import { Order, Refund } from "../models/index.js";

export const createRefundRecord = (data, transaction) => {
  return Refund.create(data, { transaction });
};

// Money already promised back for an order: refunds that are on their way or done (not failed)
export const sumActiveRefunds = async (orderId, transaction) => {
  const total = await Refund.sum("amountPesewas", {
    where: { orderId, status: { [Op.in]: ["PENDING", "PROCESSED"] } },
    transaction,
  });
  return total || 0;
};

export const sumProcessedRefunds = async (orderId, transaction) => {
  const total = await Refund.sum("amountPesewas", {
    where: { orderId, status: "PROCESSED" },
    transaction,
  });
  return total || 0;
};

// Admins: refunds newest first, optionally one status, with the order number [AC-ADM-06]
export const findRefundsForAdmin = ({ status, limit, offset }) => {
  return Refund.findAndCountAll({
    where: status ? { status } : {},
    include: [{ model: Order, as: "order", attributes: ["id", "orderNumber", "totalPesewas"] }],
    order: [["createdAt", "DESC"]],
    limit,
    offset,
  });
};

export const lockRefund = (refundId, transaction) => {
  return Refund.findByPk(refundId, { lock: transaction.LOCK.UPDATE, transaction });
};

export const findPendingRefunds = (limit) => {
  return Refund.findAll({
    where: { status: "PENDING" },
    attributes: ["id"],
    order: [["createdAt", "ASC"]],
    limit,
  });
};

export const findRefundsForOrder = (orderId) => {
  return Refund.findAll({ where: { orderId }, order: [["createdAt", "ASC"]] });
};

export const updateRefund = (refund, changes, transaction) => {
  return refund.update(changes, { transaction });
};
