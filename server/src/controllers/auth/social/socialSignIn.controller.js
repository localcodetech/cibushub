import { socialSignIn as signInWithProvider } from "../../../services/auth/social/socialSignIn.service.js";
import { setAuthCookies } from "../../../utils/auth/cookies.js";
import { sendSuccess } from "../../../utils/response.js";

export const socialSignIn = async (req, res) => {
  const device = {
    userAgent: req.get("user-agent"),
    ipAddress: req.ip,
  };

  const result = await signInWithProvider(req.validated.body, device);

  setAuthCookies(res, result.accessToken, result.refreshToken);

  // 201 when a new account was made, 200 for a returning user
  return sendSuccess(res, result.user, result.isNewUser ? 201 : 200);
};
