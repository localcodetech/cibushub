import { requestPasswordReset } from "../../../services/auth/password/forgotPassword.service.js";
import { sendSuccess } from "../../../utils/response.js";

export const forgotPassword = async (req, res) => {
  await requestPasswordReset(req.validated.body.identifier);

  return sendSuccess(res, {
    message: "If an account matches, a password reset code has been sent to its phone number",
  });
};
