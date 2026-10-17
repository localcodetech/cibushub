import * as Sentry from "@sentry/node";
import pkg from "../../package.json" with { type: "json" };
import env from "./env/env.js";

// ─────────────────────────────────────────────
// Sentry: tells us when the API or the worker crashes [AC-MON-01, AC-MON-06]
// ─────────────────────────────────────────────
// Only in production, and only when SENTRY_DSN is set: a laptop or a test never sends
// anything. Imported first by index.js and worker.js, so even a crash while starting is caught.
const isOn = env.NODE_ENV === "production" && Boolean(env.SENTRY_DSN);

if (isOn) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    // The real site and the demo report to the same project; this tells them apart
    environment: env.DEMO_SITE ? "demo" : "production",
    release: `cibushub-server@${pkg.version}`,
    // No IP addresses, cookies or user details unless we add them ourselves (only a user's ID)
    sendDefaultPii: false,
    // Request bodies, headers and query strings can hold passwords, codes and phone numbers:
    // only the method and the address are kept
    beforeSend(event) {
      if (event.request) {
        event.request = { method: event.request.method, url: event.request.url?.split("?")[0] };
      }
      return event;
    },
  });
}

// Sends one error to Sentry, with what helps to find it. Does nothing outside production.
//   details.userId: who it happened to (an ID only, never a name, phone or email)
//   details.tags:   short labels to search by, e.g. { queue: "payments" }
//   details.extra:  anything else useful, e.g. { jobId: 42 }
export const reportError = (error, details = {}) => {
  if (!isOn) {
    return;
  }
  Sentry.withScope((scope) => {
    if (details.userId) {
      scope.setUser({ id: details.userId });
    }
    if (details.tags) {
      scope.setTags(details.tags);
    }
    if (details.extra) {
      scope.setContext("details", details.extra);
    }
    Sentry.captureException(error);
  });
};

// Sends anything still waiting before the process exits (e.g. on shutdown)
export const flushErrors = () => (isOn ? Sentry.flush(2000) : Promise.resolve(true));
