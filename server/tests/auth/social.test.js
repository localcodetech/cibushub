import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import env from "../../src/config/env/env.js";
import { OAuthAccount, User } from "../../src/models/index.js";
import { TERMS_VERSION } from "../../src/utils/legal.js";
import { lastCodeSentTo, sentSms } from "../helpers/fakeSms.js";
import { TEST_PASSWORD, cookieValue, createTestUser } from "../helpers/users.js";

// Fake Google / Apple / Facebook: each test says which person the token belongs to.
// The real checks (signature, issuer, audience) live in utils/auth/socialTokens.js.
const fakeIdentity = vi.hoisted(() => ({ current: null, fails: false }));

vi.mock("../../src/utils/auth/socialTokens.js", () => {
  const check = async () => {
    if (fakeIdentity.fails) {
      throw new Error("bad signature");
    }
    return fakeIdentity.current;
  };
  return { verifyGoogleToken: check, verifyAppleToken: check, verifyFacebookToken: check };
});

const googlePerson = {
  providerUserId: "google-123",
  email: "esi@gmail.com",
  emailVerified: true,
  fullName: "Esi Owusu",
};

const socialSignIn = (body) =>
  request(app)
    .post("/api/v1/auth/social")
    .send({ provider: "GOOGLE", idToken: "fake-token", ...body });

beforeAll(() => {
  // Switch every provider on for these tests
  env.GOOGLE_CLIENT_ID = "test-google-client";
  env.APPLE_SERVICE_ID = "test-apple-service";
  env.FACEBOOK_APP_ID = "test-facebook-app";
  env.FACEBOOK_APP_SECRET = "test-facebook-secret";
});

beforeEach(() => {
  fakeIdentity.current = { ...googlePerson };
  fakeIdentity.fails = false;
});

describe("POST /api/v1/auth/social", () => {
  it("creates a customer from Google, logs them in, and saves the Terms consent", async () => {
    const response = await socialSignIn({ acceptTerms: true });

    expect(response.status).toBe(201);
    expect(cookieValue(response, "access_token")).toBeDefined();
    expect(response.body.data.fullName).toBe("Esi Owusu");
    expect(response.body.data.email).toBe("esi@gmail.com");
    expect(response.body.data.phone).toBeNull();
    expect(response.body.data.status).toBe("PENDING_VERIFICATION");
    expect(response.body.data.emailVerifiedAt).not.toBeNull();
    expect(response.body.data.termsVersion).toBe(TERMS_VERSION);
    expect(response.body.data.passwordHash).toBeUndefined();
    expect(await OAuthAccount.count()).toBe(1);
  });

  it("logs a returning Google user into the same account", async () => {
    const first = await socialSignIn({ acceptTerms: true });
    const second = await socialSignIn({});

    expect(second.status).toBe(200);
    expect(second.body.data.id).toBe(first.body.data.id);
    expect(await User.count()).toBe(1);
    expect(await OAuthAccount.count()).toBe(1);
  });

  it("refuses to create an account without the Terms checkbox", async () => {
    const response = await socialSignIn({});

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("TERMS_NOT_ACCEPTED");
    expect(await User.count()).toBe(0);
  });

  it("links Google to an existing account with the same verified email", async () => {
    const existing = await createTestUser({ email: "esi@gmail.com" });

    const response = await socialSignIn({});

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(existing.id);
    expect(await User.count()).toBe(1);
    expect(await OAuthAccount.count()).toBe(1);
  });

  it("never links or creates from an unverified provider email", async () => {
    await createTestUser({ email: "esi@gmail.com" });
    fakeIdentity.current = { ...googlePerson, emailVerified: false };

    const response = await socialSignIn({ acceptTerms: true });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("SOCIAL_EMAIL_UNVERIFIED");
    expect(await OAuthAccount.count()).toBe(0);
  });

  it("rejects a token that fails the signature check", async () => {
    fakeIdentity.fails = true;

    const response = await socialSignIn({ acceptTerms: true });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("INVALID_SOCIAL_TOKEN");
  });

  it("uses the name the browser sends for a new Apple user", async () => {
    fakeIdentity.current = {
      providerUserId: "apple-001.abc",
      email: "x7k2@privaterelay.appleid.com",
      emailVerified: true,
      fullName: null,
    };

    const response = await socialSignIn({
      provider: "APPLE",
      fullName: "Kwame Asante",
      acceptTerms: true,
    });

    expect(response.status).toBe(201);
    expect(response.body.data.fullName).toBe("Kwame Asante");
    expect(response.body.data.email).toBe("x7k2@privaterelay.appleid.com");
  });

  it("creates restaurant owners waiting for approval [AC-AUTH-05]", async () => {
    const response = await socialSignIn({ role: "RESTAURANT_OWNER", acceptTerms: true });

    expect(response.body.data.status).toBe("PENDING_APPROVAL");
  });

  it("never lets anyone sign up as an admin [AC-AUTH-06]", async () => {
    const response = await socialSignIn({ role: "ADMIN", acceptTerms: true });

    expect(response.status).toBe(400);
    expect(await User.count()).toBe(0);
  });

  it("blocks a suspended account [AC-AUTH-17]", async () => {
    await createTestUser({ email: "esi@gmail.com", status: "SUSPENDED" });

    const response = await socialSignIn({});

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("ACCOUNT_SUSPENDED");
  });

  it("answers 503 when a provider isn't set up", async () => {
    env.APPLE_SERVICE_ID = undefined;

    const response = await socialSignIn({ provider: "APPLE", acceptTerms: true });
    env.APPLE_SERVICE_ID = "test-apple-service";

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("SOCIAL_LOGIN_UNAVAILABLE");
  });

  it("creates a customer from Facebook and links the Facebook account", async () => {
    fakeIdentity.current = {
      providerUserId: "facebook-456",
      email: "kofi@example.com",
      emailVerified: true,
      fullName: "Kofi Mensah",
      pictureUrl: null,
    };

    const response = await socialSignIn({ provider: "FACEBOOK", acceptTerms: true });

    expect(response.status).toBe(201);
    expect(response.body.data.fullName).toBe("Kofi Mensah");
    const link = await OAuthAccount.findOne();
    expect(link.provider).toBe("FACEBOOK");
    expect(link.providerUserId).toBe("facebook-456");
  });

  it("asks a Facebook account with no email to sign up with a phone", async () => {
    // Facebook accounts opened with a phone number share no email
    fakeIdentity.current = {
      providerUserId: "facebook-789",
      email: null,
      emailVerified: false,
      fullName: "Ama Darko",
      pictureUrl: null,
    };

    const response = await socialSignIn({ provider: "FACEBOOK", acceptTerms: true });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("SOCIAL_EMAIL_UNVERIFIED");
    expect(response.body.error.message).toContain("Facebook");
    expect(await User.count()).toBe(0);
  });
});

describe("profile photo from Google", () => {
  const picture = "https://lh3.googleusercontent.com/a/esi-photo=s400-c";

  it("uses the Google picture as the photo when there is none", async () => {
    fakeIdentity.current = { ...googlePerson, pictureUrl: picture };

    const response = await socialSignIn({ acceptTerms: true });

    expect(response.body.data.avatarUrl).toBe(picture);
  });

  it("follows a changed Google picture at the next sign-in", async () => {
    fakeIdentity.current = { ...googlePerson, pictureUrl: picture };
    await socialSignIn({ acceptTerms: true });
    fakeIdentity.current = { ...googlePerson, pictureUrl: picture.replace("esi-photo", "new") };

    const response = await socialSignIn({});

    expect(response.body.data.avatarUrl).toContain("/a/new");
  });

  it("never replaces a photo the person uploaded", async () => {
    const uploaded = "https://res.cloudinary.com/demo/avatars/mine.webp";
    await createTestUser({
      email: "esi@gmail.com",
      avatarUrl: uploaded,
      avatarPublicId: "avatars/mine",
    });
    fakeIdentity.current = { ...googlePerson, pictureUrl: picture };

    const response = await socialSignIn({});

    expect(response.body.data.avatarUrl).toBe(uploaded);
  });
});

describe("Google / Apple users without a password", () => {
  it("can't log in with a password (same answer as a wrong password) [AC-AUTH-12]", async () => {
    await socialSignIn({ acceptTerms: true });

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: "esi@gmail.com", password: TEST_PASSWORD });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("gets no reset code before adding a phone [AC-AUTH-18]", async () => {
    await socialSignIn({ acceptTerms: true });

    const response = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ identifier: "esi@gmail.com" });

    expect(response.status).toBe(200);
    expect(sentSms.length).toBe(0);
  });
});

describe("POST /api/v1/auth/phone", () => {
  // Signs up with Google and returns a logged-in supertest agent (it keeps the cookies)
  const signedInAgent = async () => {
    const agent = request.agent(app);
    await agent
      .post("/api/v1/auth/social")
      .send({ provider: "GOOGLE", idToken: "fake-token", acceptTerms: true });
    return agent;
  };

  it("saves the phone, texts a code, and the code activates the account", async () => {
    const agent = await signedInAgent();

    const added = await agent.post("/api/v1/auth/phone").send({ phone: "054 111 2222" });
    expect(added.status).toBe(200);
    expect(added.body.data.phone).toBe("+233541112222");

    const code = lastCodeSentTo("+233541112222");
    const verified = await request(app)
      .post("/api/v1/auth/verify-phone")
      .send({ phone: "0541112222", code });

    expect(verified.status).toBe(200);
    expect(verified.body.data.status).toBe("ACTIVE");
  });

  it("refuses a phone that belongs to another account", async () => {
    await createTestUser({ email: "other@example.com", phone: "+233541112222" });
    const agent = await signedInAgent();

    const response = await agent.post("/api/v1/auth/phone").send({ phone: "0541112222" });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("PHONE_TAKEN");
  });

  it("refuses to replace a phone that is already verified", async () => {
    const agent = request.agent(app);
    await createTestUser({ email: "esi@gmail.com", phoneVerifiedAt: new Date() });
    await agent.post("/api/v1/auth/social").send({ provider: "GOOGLE", idToken: "fake-token" });

    const response = await agent.post("/api/v1/auth/phone").send({ phone: "0549998888" });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("PHONE_ALREADY_VERIFIED");
  });

  it("needs a login [AC-RBAC-02]", async () => {
    const response = await request(app).post("/api/v1/auth/phone").send({ phone: "0541112222" });

    expect(response.status).toBe(401);
  });
});
