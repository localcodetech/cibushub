import { createRateLimiter } from "./createRateLimiter.js";
import { findUserByEmailOrPhone } from "../../repositories/user.repository.js";

const FIFTEEN_MINUTES = 15 * 60;
const ONE_HOUR = 60 * 60;

const byAccount = async (req) => {
  const identifier = req.validated.body.identifier;
  const user = await findUserByEmailOrPhone(identifier, identifier);

  return user ? `user:${user.id}` : `unknown:${identifier}`;
};

export const loginAccountLimiter = createRateLimiter({
  name: "login-account",
  windowSeconds: FIFTEEN_MINUTES,
  limit: 5,
  keyBy: byAccount,
  countOnlyFailures: true,
});

export const loginIpLimiter = createRateLimiter({
  name: "login-ip",
  windowSeconds: FIFTEEN_MINUTES,
  limit: 20,
  countOnlyFailures: true,
});

export const registerLimiter = createRateLimiter({
  name: "register",
  windowSeconds: ONE_HOUR,
  limit: 10,
});

export const otpLimiter = createRateLimiter({
  name: "otp",
  windowSeconds: FIFTEEN_MINUTES,
  limit: 10,
});
