import env from "../../config/env/env.js";
import logger from "../../config/logger.js";

// Emails go out through Resend (https://resend.com), over its plain HTTPS API: no extra package.
const RESEND_URL = "https://api.resend.com/emails";
const TIMEOUT_MS = 15000;

// "kofi.mensah@gmail.com" -> "ko***@gmail.com": logs never hold a full address [AC-NOTIF-08]
export const maskEmail = (email) => {
  const [name, domain] = String(email).split("@");
  return `${(name || "").slice(0, 2)}***@${domain || "?"}`;
};

// Sends one email. Never throws: it answers { ok: true, id } or { ok: false, error },
// so a failed email never breaks the order or sign-up that asked for it.
//   to, subject, text: the address, the subject line, the plain-text body
//   html:              the branded version (optional; the text one is always sent too) [AC-NOTIF-05]
//   idempotencyKey:    the same key twice within 24 h sends only once [AC-NOTIF-04]
//   attachments:       optional files, each { filename, content } with content in base64
//                      (e.g. the receipt PDF [AC-PAY-17])
export const sendEmail = async (to, subject, text, { html, idempotencyKey, attachments } = {}) => {
  if (!to) {
    logger.warn({ subject }, "Email skipped: no address");
    return { ok: false, error: "NO_ADDRESS" };
  }

  // No Resend key: print the email instead of sending it
  if (!env.RESEND_API_KEY) {
    if (env.NODE_ENV === "development") {
      console.log(`\n[DEV EMAIL] to ${to}: ${subject}\n${text}\n`);
    } else {
      logger.error({ to: maskEmail(to), subject }, "RESEND_API_KEY is not set, email not sent");
    }
    return { ok: false, error: "NOT_CONFIGURED" };
  }

  const headers = {
    Authorization: `Bearer ${env.RESEND_API_KEY}`,
    "Content-Type": "application/json",
  };
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }

  const body = { from: env.EMAIL_FROM, to: [to], subject, text };
  if (html) {
    body.html = html;
  }
  if (attachments && attachments.length > 0) {
    body.attachments = attachments;
  }
  if (env.EMAIL_REPLY_TO) {
    body.reply_to = env.EMAIL_REPLY_TO;
  }

  let response;
  let reply;
  try {
    response = await fetch(RESEND_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    reply = await response.json().catch(() => ({}));
  } catch (error) {
    logger.error({ err: error, to: maskEmail(to), subject }, "Could not reach Resend");
    return { ok: false, error: "UNREACHABLE" };
  }

  // Resend answers { id } when it accepts the email, or { statusCode, name, message }
  if (!response.ok) {
    logger.error(
      { to: maskEmail(to), subject, status: response.status, reply },
      "Resend refused the email",
    );
    return { ok: false, error: reply.name || `HTTP_${response.status}` };
  }

  logger.info({ to: maskEmail(to), subject, id: reply.id }, "Email sent");
  return { ok: true, id: reply.id };
};
