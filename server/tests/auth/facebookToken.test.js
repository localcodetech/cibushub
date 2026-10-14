import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import env from "../../src/config/env/env.js";
import { verifyFacebookToken } from "../../src/utils/auth/socialTokens.js";

// The real Facebook check, with Facebook's Graph API faked: each test says what
// debug_token ("is this token ours?") and /me ("whose is it?") answer.
const answer = (body, status = 200) =>
  Promise.resolve({ ok: status === 200, status, json: async () => body });

const fakeFacebook = ({ check, profile }) => {
  const fetch = vi.fn((url) =>
    url.includes("/debug_token") ? answer({ data: check }) : answer(profile),
  );
  vi.stubGlobal("fetch", fetch);
  return fetch;
};

const validCheck = { is_valid: true, app_id: "our-app", user_id: "fb-1" };
const kofi = {
  id: "fb-1",
  name: "Kofi Mensah",
  email: "Kofi@Example.com",
  picture: { data: { url: "https://platform-lookaside.fbsbx.com/kofi.jpg", is_silhouette: false } },
};

beforeAll(() => {
  env.FACEBOOK_APP_ID = "our-app";
  env.FACEBOOK_APP_SECRET = "our-secret";
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("verifyFacebookToken", () => {
  it("returns the person behind a token made for our app", async () => {
    const fetch = fakeFacebook({ check: validCheck, profile: kofi });

    const identity = await verifyFacebookToken("user-token");

    expect(identity).toEqual({
      providerUserId: "fb-1",
      email: "kofi@example.com",
      emailVerified: true,
      fullName: "Kofi Mensah",
      pictureUrl: "https://platform-lookaside.fbsbx.com/kofi.jpg",
    });
    // The app proves it's us: App ID|secret for debug_token, a signed proof for /me
    expect(fetch.mock.calls[0][0]).toContain("access_token=our-app%7Cour-secret");
    expect(fetch.mock.calls[1][0]).toContain("appsecret_proof=");
  });

  it("rejects a token made for another app (stops replayed tokens)", async () => {
    fakeFacebook({ check: { ...validCheck, app_id: "someone-elses-app" }, profile: kofi });

    await expect(verifyFacebookToken("user-token")).rejects.toThrow();
  });

  it("rejects an expired or revoked token", async () => {
    fakeFacebook({ check: { ...validCheck, is_valid: false }, profile: kofi });

    await expect(verifyFacebookToken("user-token")).rejects.toThrow();
  });

  it("rejects a profile that isn't the token's owner", async () => {
    fakeFacebook({ check: validCheck, profile: { ...kofi, id: "fb-2" } });

    await expect(verifyFacebookToken("user-token")).rejects.toThrow();
  });

  it("has no email and no photo when Facebook shares none", async () => {
    const noPhoto = {
      data: { url: "https://platform-lookaside.fbsbx.com/x.jpg", is_silhouette: true },
    };
    fakeFacebook({ check: validCheck, profile: { id: "fb-1", name: "Ama", picture: noPhoto } });

    const identity = await verifyFacebookToken("user-token");

    expect(identity.email).toBeNull();
    expect(identity.emailVerified).toBe(false);
    expect(identity.pictureUrl).toBeNull();
  });

  it("ignores a photo address that isn't Facebook's", async () => {
    const elsewhere = { data: { url: "https://evil.example.com/x.jpg", is_silhouette: false } };
    fakeFacebook({ check: validCheck, profile: { ...kofi, picture: elsewhere } });

    const identity = await verifyFacebookToken("user-token");

    expect(identity.pictureUrl).toBeNull();
  });
});
