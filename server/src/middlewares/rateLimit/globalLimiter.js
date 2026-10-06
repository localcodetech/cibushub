import { createRateLimiter } from "./createRateLimiter.js";

export const globalLimiter = createRateLimiter({
  name: "global",
  windowSeconds: 60,
  limit: 100,
});
