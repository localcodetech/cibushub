import { loadScript } from "./loadScript";

// Facebook's sign-in code (the "JavaScript SDK"), and how to start it once.
const FACEBOOK_SCRIPT = "https://connect.facebook.net/en_US/sdk.js";
const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID;

// FB.init may only run once per page, even when the buttons appear again (Log in → Sign up)
let isStarted = false;

// Downloads Facebook's code and starts it with our App ID. Safe to call many times.
export const loadFacebook = async () => {
  await loadScript(FACEBOOK_SCRIPT);
  if (!isStarted) {
    window.FB.init({
      appId: FACEBOOK_APP_ID,
      // The Graph API version, the same one the server asks (utils/auth/socialTokens.js)
      version: "v23.0",
      // No Facebook cookie and no scanning the page for Facebook widgets: we only need login
      cookie: false,
      xfbml: false,
    });
    isStarted = true;
  }
};

// True once Facebook's code is loaded and started, so a click can open the pop-up at once
export const isFacebookReady = () => isStarted;

// Opens Facebook's login pop-up and returns the access token for our server to check.
// Must run straight from a click (and with the code already loaded), or browsers block the
// pop-up. Rejects with { cancelled: true } when the person closes it.
export const facebookLogin = () =>
  new Promise((resolve, reject) => {
    window.FB.login(
      (response) => {
        if (response.authResponse) {
          resolve(response.authResponse.accessToken);
        } else {
          reject({ cancelled: true });
        }
      },
      { scope: "public_profile,email" },
    );
  });
