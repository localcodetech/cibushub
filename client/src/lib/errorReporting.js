// Sentry: tells us when the app crashes in someone's browser [AC-MON-01].
// Only in the production build, and only when VITE_SENTRY_DSN is set: never while developing.
// Sentry's code is fetched after the app has started (its own small file), so it never
// slows the first screen down. An error before then is still caught by the browser's
// global handlers once Sentry is running.
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const isOn = import.meta.env.PROD && Boolean(SENTRY_DSN);

// Sentry's code once it has loaded, or null
let sentryPromise = null;

export const startErrorReporting = () => {
  if (!isOn || sentryPromise) {
    return;
  }
  sentryPromise = import("./sentryClient.js").then((Sentry) => {
    Sentry.init({
      dsn: SENTRY_DSN,
      // The real site and the demo report to the same project; this tells them apart
      environment: window.location.hostname.startsWith("demo.") ? "demo" : "production",
      // No IP address or personal details
      sendDefaultPii: false,
    });
    return Sentry;
  });
  // Sentry not reachable (an ad blocker, no internet): the app carries on without it
  sentryPromise.catch(() => {});
};

// Sends one error to Sentry. Does nothing while developing.
export const reportError = (error) => {
  if (!sentryPromise) {
    return;
  }
  sentryPromise.then((Sentry) => Sentry.captureException(error)).catch(() => {});
};
