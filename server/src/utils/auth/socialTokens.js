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
