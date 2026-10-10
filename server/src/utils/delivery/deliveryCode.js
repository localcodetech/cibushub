import { createHmac, timingSafeEqual } from "node:crypto";
import env from "../../config/env/env.js";

// The 4-digit code the customer shows the rider at the door [AC-DEL-06].
// Worked out from the delivery's id with the server's secret, so it is never stored:
// the customer's app can show it, and nobody can guess it without the secret.
export const deliveryCodeFor = (deliveryId) => {
  const digest = createHmac("sha256", env.OTP_SECRET)
    .update(`delivery-code:${deliveryId}`)
    .digest();
  return String(digest.readUInt32BE(0) % 10000).padStart(4, "0");
};

// Compared in constant time, like OTP codes
export const deliveryCodeMatches = (deliveryId, typedCode) => {
  const expected = Buffer.from(deliveryCodeFor(deliveryId));
  const typed = Buffer.from(String(typedCode));
  return expected.length === typed.length && timingSafeEqual(expected, typed);
};
