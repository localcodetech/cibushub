import { createHmac, timingSafeEqual } from "node:crypto";
import env from "../../config/env/env.js";

// Paystack signs every webhook: HMAC-SHA512 of the exact body bytes, with our secret key.
// Only someone who knows the key can make a matching signature [AC-PAY-04]
export const isValidPaystackSignature = (rawBody, signatureHeader) => {
  if (!Buffer.isBuffer(rawBody) || typeof signatureHeader !== "string") {
    return false;
  }

  const expected = createHmac("sha512", env.PAYSTACK_SECRET_KEY).update(rawBody).digest("hex");

  const expectedBytes = Buffer.from(expected, "utf8");
  const receivedBytes = Buffer.from(signatureHeader, "utf8");

  // timingSafeEqual takes the same time whether the first or the last letter differs,
  // so an attacker cannot guess the signature letter by letter from response times
  return (
    expectedBytes.length === receivedBytes.length && timingSafeEqual(expectedBytes, receivedBytes)
  );
};
