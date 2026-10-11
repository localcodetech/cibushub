import AppError from "../../utils/AppError.js";
import { isValidResendSignature } from "../../utils/notification/resendSignature.js";
import { handleResendEvent } from "../../services/notifications/emailBounce.service.js";
import { sendSuccess } from "../../utils/response.js";

// req.body is the raw bytes here (see the route), so the signature is checked on exactly what Resend sent
export const receiveResendWebhook = async (req, res) => {
  if (!isValidResendSignature(req.body, req.headers)) {
    throw new AppError(401, "INVALID_SIGNATURE", "Webhook signature is not valid");
  }

  let event;
  try {
    event = JSON.parse(req.body.toString("utf8"));
  } catch {
    throw new AppError(400, "INVALID_JSON", "Request body is not valid JSON");
  }

  const outcome = await handleResendEvent(event);

  // 200 for every event we read, so Resend stops sending it
  return sendSuccess(res, { received: true, outcome });
};
