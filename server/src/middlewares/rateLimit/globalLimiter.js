import { ipKeyGenerator } from "express-rate-limit";
import { createRateLimiter } from "./createRateLimiter.js";
import { ACCESS_COOKIE } from "../../utils/auth/cookies.js";
import { verifyAccessToken } from "../../utils/auth/tokens.js";

// The limit on every request [AC-SEC-04]:
//   logged in: 200 a minute per ACCOUNT, whatever network they're on
//   guest:     100 a minute per IP address
//
// Why not per IP for everyone: Ghana's mobile networks put thousands of phones behind the
// same few IP addresses. A per-IP limit alone would lock out many real customers at once,
// just because they share an address with someone busy.
const USER_LIMIT = 200;
const GUEST_LIMIT = 100;

// The logged-in user's ID from the login cookie, or null for a guest. Only the cookie's
// signature is checked here (no database): authenticate() still does the full check later.
// Saved on the request, because the key and the limit both ask.
export const rateLimitUserId = (req) => {
  if (req.rateLimitUserId === undefined) {
    try {
      req.rateLimitUserId = verifyAccessToken(req.cookies[ACCESS_COOKIE]).sub;
    } catch {
      // No cookie, a made-up one, or an expired one: counted as a guest
      req.rateLimitUserId = null;
    }
  }
  return req.rateLimitUserId;
};

export const globalLimitKey = (req) => {
  const userId = rateLimitUserId(req);
  return userId ? `user:${userId}` : `ip:${ipKeyGenerator(req.ip)}`;
};

export const globalLimitFor = (req) => (rateLimitUserId(req) ? USER_LIMIT : GUEST_LIMIT);

export const globalLimiter = createRateLimiter({
  name: "global",
  windowSeconds: 60,
  limit: globalLimitFor,
  keyBy: globalLimitKey,
});
