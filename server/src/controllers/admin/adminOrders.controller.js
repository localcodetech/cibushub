import { adminCancelOrder } from "../../services/order/adminCancelOrder.service.js";
import { sendSuccess } from "../../utils/response.js";

export const cancelOrderAsAdmin = async (req, res) => {
  const admin = { id: req.user.id, role: req.user.role, ipAddress: req.ip };
  const order = await adminCancelOrder(admin, req.params.orderId, req.validated.body);

  return sendSuccess(res, order);
};
