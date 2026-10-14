import { createHmac } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import env from "../../config/env/env.js";

// Google and Apple sign their ID tokens with private keys and publish the matching
// public keys at these addresses. jose downloads them (and caches them) to check the
// signature, so a token made up by anyone else is rejected.
const GOOGLE_KEYS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const APPLE_KEYS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

// Google's profile picture, asked for at 400px (it comes as a small 96px one by default).
// Only Google's own image address is accepted.
const googlePicture = (url) => {
  if (typeof url !== "string" || !url.startsWith("https://lh3.googleusercontent.com/")) {
    return null;
  }
  return url.replace(/=s\d+(-c)?$/, "=s400-c");
};

// Checks a Google ID token and returns who it belongs to.
// Throws if the signature, issuer, audience (our client ID) or expiry is wrong.
export const verifyGoogleToken = async (idToken) => {
  const { payload } = await jwtVerify(idToken, GOOGLE_KEYS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: env.GOOGLE_CLIENT_ID,
  });

  return {
    providerUserId: payload.sub,
    email: payload.email ? payload.email.toLowerCase() : null,
    emailVerified: payload.email_verified === true,
    fullName: payload.name || null,
    pictureUrl: googlePicture(payload.picture),
  };
};

// Checks an Apple ID token. Apple puts no name in the token: the browser gets it
// once, on the very first sign-in, and sends it separately.
export const verifyAppleToken = async (idToken) => {
  const { payload } = await jwtVerify(idToken, APPLE_KEYS, {
    issuer: "https://appleid.apple.com",
    audience: env.APPLE_SERVICE_ID,
  });

  return {
    providerUserId: payload.sub,
    email: payload.email ? payload.email.toLowerCase() : null,
    // Apple sends true or "true"
    emailVerified: payload.email_verified === true || payload.email_verified === "true",
    fullName: null,
    // Sign in with Apple never shares a photo
    pictureUrl: null,
  };
};

// Facebook's Graph API. A version is named so Facebook can't change the answers under us;
// each version lasts about two years, so move it up now and then.
const FACEBOOK_GRAPH = "https://graph.facebook.com/v23.0";

// Asks Facebook's Graph API and returns its JSON. Throws on any error or after 5 seconds.
const askFacebook = async (path, params) => {
  const url = `${FACEBOOK_GRAPH}${path}?${new URLSearchParams(params)}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
  const body = await response.json();
  if (!response.ok || body.error) {
    throw new Error(`Facebook said no: ${body.error ? body.error.message : response.status}`);
  }
  return body;
};

// Facebook's profile picture. Only Facebook's own image addresses are accepted, and the
// grey "no photo" shape is skipped (their initials look better)
const facebookPicture = (picture) => {
  const data = picture && picture.data;
  if (!data || data.is_silhouette || typeof data.url !== "string") {
    return null;
  }
  const { protocol, hostname } = new URL(data.url);
  const isFacebooks = hostname.endsWith(".fbsbx.com") || hostname.endsWith(".fbcdn.net");
  return protocol === "https:" && isFacebooks ? data.url : null;
};

// Checks a Facebook access token and returns who it belongs to.
// Unlike Google and Apple, Facebook gives the browser a plain access token with no signature
// to check. So the server asks Facebook two questions:
//   1. debug_token: "is this token real, and was it made for OUR app?" The app ID and secret
//      prove it's us asking. Without the app check, a token from any other site that uses
//      Facebook Login could be replayed here to log in as its owner.
//   2. /me: "whose is it?" (id, name, email, picture)
export const verifyFacebookToken = async (accessToken) => {
  const appToken = `${env.FACEBOOK_APP_ID}|${env.FACEBOOK_APP_SECRET}`;
  const { data: check } = await askFacebook("/debug_token", {
    input_token: accessToken,
    access_token: appToken,
  });
  if (!check.is_valid || check.app_id !== env.FACEBOOK_APP_ID) {
    throw new Error("Facebook token is not valid for this app");
  }

  const profile = await askFacebook("/me", {
    fields: "id,name,email,picture.width(400).height(400)",
    access_token: accessToken,
    // Proves the request comes from our server, not from someone who copied the token
    appsecret_proof: createHmac("sha256", env.FACEBOOK_APP_SECRET)
      .update(accessToken)
      .digest("hex"),
  });
  if (profile.id !== check.user_id) {
    throw new Error("Facebook token and profile don't match");
  }

  return {
    providerUserId: profile.id,
    email: profile.email ? profile.email.toLowerCase() : null,
    // Facebook only shares an email address its owner has confirmed
    emailVerified: Boolean(profile.email),
    fullName: profile.name || null,
    pictureUrl: facebookPicture(profile.picture),
  };
};
