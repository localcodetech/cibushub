import { logoutSession } from "../../../services/auth/session/logout.service.js";
import { clearAuthCookies, REFRESH_COOKIE } from "../../../utils/auth/cookies.js";
import { sendSuccess } from "../../../utils/response.js";

export const logout = async (req, res) => {
  await logoutSession(req.cookies[REFRESH_COOKIE]);

  clearAuthCookies(res);

  return sendSuccess(res, { message: "You have been logged out" });
};
