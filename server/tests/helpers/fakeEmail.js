// Emails "sent" during a test, newest last: { to, subject, text, html?, idempotencyKey? }
export const sentEmails = [];

// Make the next sends fail, e.g. emailFailures.push({ ok: false, error: "UNREACHABLE" })
export const emailFailures = [];
