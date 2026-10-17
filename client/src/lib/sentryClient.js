import { captureException, init } from "@sentry/browser";

// Only the two Sentry functions the app uses. Named imports let the build leave the rest of
// Sentry out (lib/errorReporting.js loads this file after the app has started).
export { captureException, init };
