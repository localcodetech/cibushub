// Emails "sent" during a test, newest last: { to, subject, text, html?, idempotencyKey? }
export const sentEmails = [];

// Make the next sends fail, e.g. emailFailures.push({ ok: false, error: "UNREACHABLE" })
export const emailFailures = [];

// The code in the newest code email to this address, e.g. "482913" (or null).
// The branded code email starts its subject with it: "482913 is your CibusHub code"
export const lastCodeEmailedTo = (email) => {
  const emails = sentEmails.filter((sent) => sent.to === email);
  const match = emails.at(-1)?.subject.match(/^(\d{6}) is your CibusHub code$/);
  return match ? match[1] : null;
};
