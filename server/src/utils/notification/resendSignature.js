import { createHmac, timingSafeEqual } from "node:crypto";
import env from "../../config/env/env.js";

// Resend signs every webhook the "Svix" way (https://docs.svix.com/receiving/verifying-payloads/how-manual):
//   svix-id, svix-timestamp: headers that make each message unique
//   svix-signature:          "v1,<base64 signature>" (several, space-separated, while a secret rotates)
// The signature is HMAC-SHA256 of "<id>.<timestamp>.<exact body>", keyed with our secret
// (the part after "whsec_", base64-decoded). Only Resend knows the secret.

// A message older (or newer) than 5 minutes is refused, so a captured one can't be replayed later
const TOLERANCE_SECONDS = 5 * 60;

const sameText = (expected, received) => {
  const expectedBytes = Buffer.from(expected, "utf8");
  const receivedBytes = Buffer.from(received, "utf8");
  return (
    expectedBytes.length === receivedBytes.length && timingSafeEqual(expectedBytes, receivedBytes)
  );
};

export const isValidResendSignature = (rawBody, headers, now = new Date()) => {
  const id = headers["svix-id"];
  const timestamp = headers["svix-timestamp"];
  const signatures = headers["svix-signature"];

  if (!env.RESEND_WEBHOOK_SECRET || !Buffer.isBuffer(rawBody) || !id || !timestamp || !signatures) {
    return false;
  }

  const ageSeconds = Math.abs(now.getTime() / 1000 - Number(timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > TOLERANCE_SECONDS) {
    return false;
  }

  const secret = Buffer.from(env.RESEND_WEBHOOK_SECRET.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", secret)
    .update(`${id}.${timestamp}.`)
    .update(rawBody)
    .digest("base64");

  // "v1,abc v1,def": any one matching is enough
  return signatures
    .split(" ")
    .map((entry) => entry.split(",")[1] || "")
    .some((received) => sameText(expected, received));
};
