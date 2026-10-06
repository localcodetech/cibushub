import env from "../../config/env/env.js";
import logger from "../../config/logger.js";

const maskPhone = (phone) => {
  return `${phone.slice(0, 4)}*****${phone.slice(-4)}`;
};

export const sendSms = async (phone, message) => {
  if (env.NODE_ENV === "development") {
    console.log(`\n[DEV SMS] to ${phone}: ${message}\n`);
    return;
  }

  logger.info({ to: maskPhone(phone) }, "SMS provider not configured yet, message not sent");
};
