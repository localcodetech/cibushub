import { checkCart } from "../../services/cart/cartCheck.service.js";
import { sendSuccess } from "../../utils/response.js";

export const checkMyCart = async (req, res) => {
  const result = await checkCart(req.validated.body);

  return sendSuccess(res, result);
};
