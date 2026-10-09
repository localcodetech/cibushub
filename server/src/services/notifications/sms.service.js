import env from "../../config/env/env.js";
import logger from "../../config/logger.js";

const NALO_URL = "https://sms.nalosolutions.com/smsbackend/clientapi/Resl_Nalo/send-message/";
const TIMEOUT_MS = 15000;

const maskPhone = (phone) => {
  return `${phone.slice(0, 4)}*****${phone.slice(-4)}`;
};

// Sends one text message through Nalo Solutions.
// It never throws: a failed SMS is written to the log and the caller carries on.
export const sendSms = async (phone, message) => {
  // A Google / Apple user may not have added a phone yet
  if (!phone) {
    logger.warn("SMS skipped: the user has no phone number");
    return;
  }

  // No Nalo key: print the message instead of sending it
  if (!env.NALO_API_KEY) {
    if (env.NODE_ENV === "development") {
      console.log(`\n[DEV SMS] to ${phone}: ${message}\n`);
    } else {
      logger.error({ to: maskPhone(phone) }, "NALO_API_KEY is not set, SMS not sent");
    }
    return;
  }

  // URLSearchParams builds the "?key=...&message=..." part and URL-encodes every value,
  // so spaces, "+" or "&" in the key or the message can't break the address
  const query = new URLSearchParams({
    key: env.NALO_API_KEY,
    type: "0", // 0 = a normal text message
    destination: phone.replace("+", ""), // we store +233XXXXXXXXX, Nalo wants 233XXXXXXXXX
    dlr: "1", // ask for a delivery report
    source: env.NALO_SENDER_ID || "CibusHub", // the name the receiver sees
    message: message,
  });

  let reply;

  try {
    const response = await fetch(`${NALO_URL}?${query}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    reply = await response.text();
  } catch (error) {
    // Never log the address itself: it contains the API key
    logger.error({ err: error, to: maskPhone(phone) }, "Could not reach Nalo SMS");
    return;
  }

  // Nalo answers in plain text. Success looks like "1701|233XXXXXXXXX|<message id>".
  // Anything else is an error code, e.g. 1025 (no credit) or 1707 (sender ID not approved)
  if (!reply.startsWith("1701")) {
    logger.error({ to: maskPhone(phone), reply: reply }, "Nalo refused the SMS");
    return;
  }

  logger.info({ to: maskPhone(phone) }, "SMS sent");
};
