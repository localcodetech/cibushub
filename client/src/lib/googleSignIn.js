import { loadScript } from "./loadScript";

// Google's sign-in script, and how to fetch it ahead of time.
export const GOOGLE_SCRIPT = "https://accounts.google.com/gsi/client";

// Downloads Google's script quietly while the browser is idle, so the "Continue with Google"
// button appears at once on Log in and Sign up. Only for guests, and only once (loadScript
// reuses the first download). A failure here doesn't matter: the button page tries again.
export const prefetchGoogleSignIn = () => {
  if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
    return;
  }
  const start = () => loadScript(GOOGLE_SCRIPT).catch(() => {});
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(start, { timeout: 4000 });
  } else {
    setTimeout(start, 2000);
  }
};
