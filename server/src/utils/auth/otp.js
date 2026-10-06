import { randomInt, createHmac, timingSafeEqual } from "node:crypto";
import env from "../../config/env/env.js";

export const generateOtp = () => {
  return randomInt(0, 1000000).toString().padStart(6, "0");
};

export const hashOtp = (code) => {
  return createHmac("sha256", env.OTP_SECRET).update(code).digest("hex");
};

export const otpMatches = (code, storedHash) => {
  const typedHash = Buffer.from(hashOtp(code));
  const savedHash = Buffer.from(storedHash);

  return typedHash.length === savedHash.length && timingSafeEqual(typedHash, savedHash);
};
