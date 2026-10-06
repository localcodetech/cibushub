import { refreshSession } from "../../services/auth/refresh.service.js";
import { clearAuthCookies, REFRESH_COOKIE, setAuthCookies } from "../../utils/cookies.js";
import { sendSuccess } from "../../utils/response.js";

export const refresh = async (req, res) => {
  const rawRefreshToken = req.cookies[REFRESH_COOKIE];

  const device = {
    userAgent: req.get("user-agent"),
    ipAddress: req.ip,
  };

  try {
    const result = await refreshSession(rawRefreshToken, device);

    setAuthCookies(res, result.accessToken, result.refreshToken);

    return sendSuccess(res, result.user);
  } catch (error) {
    clearAuthCookies(res);
    throw error;
  }
};
