import { loginUser } from "../../../services/auth/session/login.service.js";
import { setAuthCookies } from "../../../utils/auth/cookies.js";
import { sendSuccess } from "../../../utils/response.js";

export const login = async (req, res) => {
  const { identifier, password } = req.validated.body;

  const device = {
    userAgent: req.get("user-agent"),
    ipAddress: req.ip,
  };

  const result = await loginUser(identifier, password, device);

  setAuthCookies(res, result.accessToken, result.refreshToken);

  return sendSuccess(res, result.user);
};
