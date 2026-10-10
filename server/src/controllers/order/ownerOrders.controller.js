import {
  acceptOrder,
  getOwnerDailySummary,
  getOwnerOrder,
  listOwnerBoard,
  listOwnerHistory,
  markReady,
  rejectOrder,
  startPreparing,
} from "../../services/order/ownerOrders.service.js";
import { sendSuccess } from "../../utils/response.js";

export const getBoard = async (req, res) => {
  const orders = await listOwnerBoard(req.user.id, req.validated.query);

  return sendSuccess(res, orders);
};

export const getHistory = async (req, res) => {
  const { orders, meta } = await listOwnerHistory(req.user.id, req.validated.query);

  return sendSuccess(res, orders, 200, meta);
};

export const getSummary = async (req, res) => {
  const summary = await getOwnerDailySummary(req.user.id, req.validated.query);

  return sendSuccess(res, summary);
};

export const getOrder = async (req, res) => {
  const order = await getOwnerOrder(req.user.id, req.params.orderId);

  return sendSuccess(res, order);
};

export const accept = async (req, res) => {
  const order = await acceptOrder(
    req.user.id,
    req.params.orderId,
    req.validated.body.prepTimeMinutes,
  );

  return sendSuccess(res, order);
};

export const reject = async (req, res) => {
  const order = await rejectOrder(req.user.id, req.params.orderId, req.validated.body.reason);

  return sendSuccess(res, order);
};

export const preparing = async (req, res) => {
  const order = await startPreparing(req.user.id, req.params.orderId);

  return sendSuccess(res, order);
};

export const ready = async (req, res) => {
  const order = await markReady(req.user.id, req.params.orderId);

  return sendSuccess(res, order);
};
