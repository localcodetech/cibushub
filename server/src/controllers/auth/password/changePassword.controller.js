import { changePassword as changeUserPassword } from "../../../services/auth/password/changePassword.service.js";
import { setAuthCookies } from "../../../utils/auth/cookies.js";
import { sendSuccess } from "../../../utils/response.js";

export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.validated.body;

  const device = {
    userAgent: req.get("user-agent"),
    ipAddress: req.ip,
  };

  const tokens = await changeUserPassword(req.user.id, currentPassword, newPassword, device);

  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

  return sendSuccess(res, {
    message: "Your password has been changed. Other devices have been logged out",
  });
};
