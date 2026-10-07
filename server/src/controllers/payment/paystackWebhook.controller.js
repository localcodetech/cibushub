import AppError from "../../utils/AppError.js";
import { isValidPaystackSignature } from "../../utils/payment/paystackSignature.js";
import { handlePaystackEvent } from "../../services/payment/paystackWebhook.service.js";
import { sendSuccess } from "../../utils/response.js";

// req.body is the raw bytes here (see the route), so the signature is checked on exactly what Paystack sent
export const receivePaystackWebhook = async (req, res) => {
  if (!isValidPaystackSignature(req.body, req.get("x-paystack-signature"))) {
    throw new AppError(401, "INVALID_SIGNATURE", "Webhook signature is not valid");
  }

  let event;
  try {
    event = JSON.parse(req.body.toString("utf8"));
  } catch {
    throw new AppError(400, "INVALID_JSON", "Request body is not valid JSON");
  }

  const outcome = await handlePaystackEvent(event);

  // 200 for every handled event, repeats included, so Paystack stops sending it [AC-PAY-07]
  return sendSuccess(res, { received: true, outcome });
};
