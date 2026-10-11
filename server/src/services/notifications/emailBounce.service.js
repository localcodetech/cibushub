import logger from "../../config/logger.js";
import { maskEmail } from "./email.service.js";
import { findUserByEmail, updateUser } from "../../repositories/user.repository.js";

// What Resend tells us after sending [AC-NOTIF-08]. We act on one event:
//   "email.bounced": the address doesn't work. Mark the account, so we stop sending it
//   ordinary emails, and ask the user to confirm or change it at their next login.
// A "Transient" bounce (e.g. a full mailbox) is only logged: it may work tomorrow.
// Answers what was done, for the webhook reply: BOUNCE_RECORDED, IGNORED.
export const handleResendEvent = async (event, now = new Date()) => {
  if (event.type !== "email.bounced") {
    return "IGNORED";
  }

  const bounceType = event.data?.bounce?.type;
  const addresses = event.data?.to || [];

  if (bounceType === "Transient") {
    logger.warn({ to: addresses.map(maskEmail) }, "Email soft-bounced; still sending to it");
    return "IGNORED";
  }

  for (const address of addresses) {
    const user = await findUserByEmail(address);
    if (user && !user.emailBouncedAt) {
      // No longer a proven address: they'll be asked to confirm (or change) it again
      await updateUser(user, { emailBouncedAt: now, emailVerifiedAt: null });
    }
    logger.warn({ to: maskEmail(address), userId: user?.id }, "Email bounced; address marked");
  }
  return "BOUNCE_RECORDED";
};
