import { checkMyPaymentStatus } from "../../services/payment/paymentStatus.service.js";
import { sendSuccess } from "../../utils/response.js";

export const getPaymentStatus = async (req, res) => {
  const status = await checkMyPaymentStatus(req.user.id, req.params.orderId);

  return sendSuccess(res, status);
};
