import { resetPassword as resetUserPassword } from "../../../services/auth/password/resetPassword.service.js";
import { clearAuthCookies } from "../../../utils/auth/cookies.js";
import { sendSuccess } from "../../../utils/response.js";

export const resetPassword = async (req, res) => {
  const { identifier, code, newPassword } = req.validated.body;

  await resetUserPassword(identifier, code, newPassword);

  clearAuthCookies(res);

  return sendSuccess(res, {
    message: "Your password has been reset. Please log in with your new password",
  });
};
