import { buildQuote } from "../../services/checkout/quote.service.js";
import { sendSuccess } from "../../utils/response.js";

export const getQuote = async (req, res) => {
  const quote = await buildQuote(req.user.id, req.validated.body);
  // CibusHub's commission is between us and the restaurant, not for the customer
  delete quote.commissionPercent;

  return sendSuccess(res, quote);
};
