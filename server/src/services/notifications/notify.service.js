import logger from "../../config/logger.js";
import { NotificationLog } from "../../models/index.js";
import { scheduleNotification } from "../../jobs/enqueue.js";
import { sendEmail, maskEmail } from "./email.service.js";
import { sendSms, maskPhone } from "./sms.service.js";
import { emitAdminAlert } from "../../sockets/emitAdminAlert.js";

// How every email and SMS leaves CibusHub [AC-NOTIF-02, 03, 04, 08]:
//   1. a notification_logs row is written (status QUEUED), with the event's dedupe key;
//   2. a background job sends it, so a slow provider never slows the request;
//   3. a failed send is tried 3 times, waiting longer each time; then FAILED + admin alert.

// Errors that won't get better by trying again
const PERMANENT_ERRORS = ["NO_ADDRESS", "NOT_CONFIGURED", "validation_error", "invalid_to_address"];

// The one function callers use.
//   channel:  "EMAIL" or "SMS"
//   to:       the email address or E.164 phone
//   template: what kind of message, for the log, e.g. "refund.started"
//   key:      the event's dedupe key, e.g. "refund:<id>:started:sms", or null (no check)
//   subject, text, html: the message (subject and html for email only)
//   attachments: email files, each { filename, content } with content in base64
// Returns { logId } or { duplicate: true }. Never throws: a message must never break the
// order, payment or sign-up that triggered it.
export const notify = async ({
  channel,
  to,
  template,
  key = null,
  subject,
  text,
  html,
  attachments,
}) => {
  if (!to) {
    logger.warn({ channel, template }, "Notification skipped: no address");
    return { skipped: true };
  }

  let log;
  try {
    log = await NotificationLog.create({
      channel,
      template,
      dedupeKey: key,
      recipientMasked: channel === "EMAIL" ? maskEmail(to) : maskPhone(to),
    });
  } catch (error) {
    // The same event was already sent (or is on its way): don't send it again [AC-NOTIF-04]
    if (error.name === "SequelizeUniqueConstraintError") {
      logger.info({ channel, template, key }, "Duplicate notification skipped");
      return { duplicate: true };
    }
    logger.error({ err: error, channel, template }, "Could not log notification; sending anyway");
    log = null;
  }

  const payload = { channel, to, subject, text, html, attachments };
  if (!log) {
    await deliver(payload, null);
    return { logId: null };
  }

  // Redis down? Send it now instead: a sign-up code must still arrive [AC-MON-04]
  const queued = await scheduleNotification(log.id, payload);
  if (!queued) {
    await processNotification({ data: { logId: log.id, payload }, attemptsMade: 0, opts: {} });
  }
  return { logId: log.id };
};

// One try at sending. Answers the provider's { ok, id | error }.
const deliver = (payload, logId) => {
  if (payload.channel === "EMAIL") {
    // The same key on a retry: Resend sends it only once even if our first try timed out
    return sendEmail(payload.to, payload.subject, payload.text, {
      html: payload.html,
      attachments: payload.attachments,
      idempotencyKey: logId ? `notification-${logId}` : undefined,
    });
  }
  return sendSms(payload.to, payload.text);
};

// The background job [AC-NOTIF-03]. Throwing makes BullMQ try again later; the last failure
// is recorded as FAILED and admins are told.
export const processNotification = async (job) => {
  const { logId, payload } = job.data;
  const log = await NotificationLog.findByPk(logId);
  if (!log || log.status === "SENT") {
    return { skipped: true };
  }

  const result = await deliver(payload, logId);
  const attempts = log.attempts + 1;

  if (result.ok) {
    await log.update({
      status: "SENT",
      attempts,
      providerMessageId: result.id || null,
      lastError: null,
      sentAt: new Date(),
    });
    return { sent: true };
  }

  const maxAttempts = job.opts.attempts || 1;
  const isLastTry = job.attemptsMade + 1 >= maxAttempts;
  const isPermanent = PERMANENT_ERRORS.includes(result.error);

  if (isPermanent || isLastTry) {
    await log.update({ status: "FAILED", attempts, lastError: String(result.error).slice(0, 255) });
    emitAdminAlert("NOTIFICATION_FAILED", {
      logId,
      channel: log.channel,
      template: log.template,
      error: result.error,
    });
    return { failed: true, error: result.error };
  }

  await log.update({ attempts, lastError: String(result.error).slice(0, 255) });
  throw new Error(`Notification ${logId} not sent (${result.error}); trying again`);
};
