import {
  listPaymentsForAdmin,
  listRefundsForAdmin,
  retryRefund,
  reverifyPayment,
} from "../../services/admin/adminPayments.service.js";
import { sendSuccess } from "../../utils/response.js";

// Who is acting and from where, for the audit log
const adminFrom = (req) => ({ id: req.user.id, ipAddress: req.ip });

export const listPayments = async (req, res) => {
  const { payments, meta } = await listPaymentsForAdmin(req.validated.query);

  return sendSuccess(res, payments, 200, meta);
};

export const reverify = async (req, res) => {
  const result = await reverifyPayment(adminFrom(req), req.params.paymentId);

  return sendSuccess(res, result);
};

export const listRefunds = async (req, res) => {
  const { refunds, meta } = await listRefundsForAdmin(req.validated.query);

  return sendSuccess(res, refunds, 200, meta);
};

export const retry = async (req, res) => {
  const refund = await retryRefund(adminFrom(req), req.params.refundId, req.validated.body.reason);

  return sendSuccess(res, refund);
};
