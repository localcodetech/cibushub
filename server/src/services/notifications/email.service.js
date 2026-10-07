import env from "../../config/env/env.js";
import logger from "../../config/logger.js";

const maskEmail = (email) => {
  const [name, domain] = email.split("@");
  return `${name.slice(0, 2)}***@${domain}`;
};

// Placeholder until an email provider (Resend/SendGrid) is connected in the notifications step
export const sendEmail = async (to, subject, text) => {
  if (env.NODE_ENV === "development") {
    console.log(`\n[DEV EMAIL] to ${to}: ${subject}\n${text}\n`);
    return;
  }

  logger.info({ to: maskEmail(to), subject }, "Email provider not configured yet, email not sent");
};
