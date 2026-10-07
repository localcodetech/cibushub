import { startPayment } from "../../services/payment/startPayment.service.js";
import { sendSuccess } from "../../utils/response.js";

export const payForOrder = async (req, res) => {
  const checkout = await startPayment(req.user.id, req.params.orderId);

  return sendSuccess(res, checkout);
};
