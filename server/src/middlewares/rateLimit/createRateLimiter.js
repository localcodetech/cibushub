import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import redis from "../../config/redis.js";
import AppError from "../../utils/AppError.js";

const byIp = (req) => ipKeyGenerator(req.ip);

export const createRateLimiter = ({
  name,
  windowSeconds,
  limit,
  keyBy = byIp,
  countOnlyFailures = false,
}) => {
  return rateLimit({
    windowMs: windowSeconds * 1000,
    limit,
    keyGenerator: keyBy,
    skipSuccessfulRequests: countOnlyFailures,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    passOnStoreError: true,
    store: new RedisStore({
      prefix: `ratelimit:${name}:`,
      sendCommand: (...args) => redis.call(...args),
    }),
    handler: (req, res, next) => {
      const secondsLeft = Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000);

      next(
        new AppError(429, "RATE_LIMITED", "Too many attempts. Please try again later", [
          { retryAfterSeconds: secondsLeft },
        ]),
      );
    },
  });
};
