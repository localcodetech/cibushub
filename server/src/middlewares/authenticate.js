import AppError from "../utils/AppError.js";
import { ACCESS_COOKIE } from "../utils/cookies.js";
import { verifyAccessToken } from "../utils/tokens.js";
import { findUserById } from "../repositories/user.repository.js";

const notLoggedIn = () => {
  return new AppError(401, "UNAUTHENTICATED", "Please log in to continue");
};

const authenticate = async (req, res, next) => {
  const accessToken = req.cookies[ACCESS_COOKIE];

  if (!accessToken) {
    throw notLoggedIn();
  }

  let payload;
  try {
    payload = verifyAccessToken(accessToken);
  } catch {
    throw notLoggedIn();
  }

  const user = await findUserById(payload.sub);

  if (!user) {
    throw notLoggedIn();
  }

  if (user.status === "SUSPENDED") {
    throw new AppError(403, "ACCOUNT_SUSPENDED", "Your account has been suspended");
  }

  req.user = user;

  next();
};

export default authenticate;
