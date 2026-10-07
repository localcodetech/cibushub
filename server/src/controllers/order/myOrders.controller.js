import { cancelMyOrder, getMyOrder, listMyOrders } from "../../services/order/myOrders.service.js";
import { sendSuccess } from "../../utils/response.js";

export const listOrders = async (req, res) => {
  const { orders, meta } = await listMyOrders(req.user.id, req.validated.query);

  return sendSuccess(res, orders, 200, meta);
};

export const getOrder = async (req, res) => {
  const order = await getMyOrder(req.user.id, req.params.orderId);

  return sendSuccess(res, order);
};

export const cancelOrder = async (req, res) => {
  const order = await cancelMyOrder(req.user.id, req.params.orderId, req.validated.body.reason);

  return sendSuccess(res, order);
};
