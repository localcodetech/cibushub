import { placeOrder } from "../../services/order/placeOrder.service.js";
import { sendSuccess } from "../../utils/response.js";

export const createOrder = async (req, res) => {
  const { order, isNew } = await placeOrder(
    req.user.id,
    req.validated.body,
    req.validated.headers["idempotency-key"],
  );

  // 201 the first time; 200 when the same request comes again and gets the same order
  return sendSuccess(res, order, isNew ? 201 : 200);
};
