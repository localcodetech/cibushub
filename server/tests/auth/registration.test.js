import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { User } from "../../src/models/index.js";
import { lastCodeSentTo } from "../helpers/fakeSms.js";
import { TERMS_VERSION } from "../../src/utils/legal.js";

const validCustomer = {
  fullName: "Ama Mensah",
  email: "ama@example.com",
  phone: "024 123 4567",
  password: "Kofi2026",
  acceptTerms: true,
};

const register = (body) => request(app).post("/api/v1/auth/register").send(body);
const verifyPhone = (body) => request(app).post("/api/v1/auth/verify-phone").send(body);

describe("POST /api/v1/auth/register", () => {
  it("creates a customer waiting for verification [AC-AUTH-01, AC-AUTH-04]", async () => {
    const response = await register(validCustomer);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.role).toBe("CUSTOMER");
    expect(response.body.data.status).toBe("PENDING_VERIFICATION");
    expect(response.body.data.phone).toBe("+233241234567");
    expect(response.body.data.passwordHash).toBeUndefined();
  });

  it("stores only a bcrypt hash of the password [AC-AUTH-01]", async () => {
    await register(validCustomer);

    const user = await User.scope("withPassword").findOne({ where: { email: "ama@example.com" } });
    expect(user.passwordHash).not.toBe("Kofi2026");
    expect(user.passwordHash.startsWith("$2b$")).toBe(true);
  });

  it("saves when the Terms were accepted, and which version [plan-review §3]", async () => {
    const before = new Date();
    await register(validCustomer);

    const user = await User.findOne({ where: { email: "ama@example.com" } });
    expect(user.termsVersion).toBe(TERMS_VERSION);
    expect(user.termsAcceptedAt.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
  });

  it("refuses sign-up without accepting the Terms [plan-review §3]", async () => {
    const notTicked = await register({ ...validCustomer, acceptTerms: false });
    const missing = await register({ ...validCustomer, acceptTerms: undefined });

    for (const response of [notTicked, missing]) {
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
      expect(response.body.error.details[0].field).toBe("acceptTerms");
    }
    expect(await User.count()).toBe(0);
  });

  it("says no to offers and news unless the box is ticked [AC-NOTIF-09]", async () => {
    await register(validCustomer);
    await register({
      ...validCustomer,
      email: "kofi@example.com",
      phone: "055 111 2222",
      marketingOptIn: true,
    });

    const ama = await User.findOne({ where: { email: "ama@example.com" } });
    const kofi = await User.findOne({ where: { email: "kofi@example.com" } });
    expect(ama.marketingOptIn).toBe(false);
    expect(ama.marketingOptInChangedAt).toBeNull();
    expect(kofi.marketingOptIn).toBe(true);
    expect(kofi.marketingOptInChangedAt).not.toBeNull();
  });

  it("texts a 6-digit verification code [AC-AUTH-07]", async () => {
    await register(validCustomer);

    expect(lastCodeSentTo("+233241234567")).toMatch(/^\d{6}$/);
  });

  it("rejects a duplicate email or phone with 409 [AC-AUTH-02]", async () => {
    await register(validCustomer);

    const sameEmail = await register({ ...validCustomer, phone: "0551112222" });
    const samePhone = await register({ ...validCustomer, email: "other@example.com" });

    expect(sameEmail.status).toBe(409);
    expect(sameEmail.body.error.code).toBe("ACCOUNT_EXISTS");
    expect(samePhone.status).toBe(409);
  });

  it("rejects bad input with field details [AC-GLOBAL-03, AC-AUTH-03]", async () => {
    const response = await register({
      fullName: "A",
      email: "nope",
      phone: "123",
      password: "short",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");

    const fields = response.body.error.details.map((detail) => detail.field);
    expect(fields).toEqual(expect.arrayContaining(["fullName", "email", "phone", "password"]));
  });

  it("never lets anyone register as an admin [AC-AUTH-06]", async () => {
    const asAdmin = await register({ ...validCustomer, role: "ADMIN" });
    const asSuperAdmin = await register({ ...validCustomer, role: "SUPER_ADMIN" });

    expect(asAdmin.status).toBe(400);
    expect(asSuperAdmin.status).toBe(400);
    expect(await User.count()).toBe(0);
  });

  it("rejects extra fields like status [AC-SEC-07]", async () => {
    const response = await register({ ...validCustomer, status: "ACTIVE" });

    expect(response.status).toBe(400);
  });

  it("creates restaurant owners and riders waiting for approval [AC-AUTH-05]", async () => {
    const owner = await register({ ...validCustomer, role: "RESTAURANT_OWNER" });
    const rider = await register({
      ...validCustomer,
      email: "rider@example.com",
      phone: "0551112222",
      role: "RIDER",
    });

    expect(owner.body.data.status).toBe("PENDING_APPROVAL");
    expect(rider.body.data.status).toBe("PENDING_APPROVAL");
  });
});

describe("POST /api/v1/auth/verify-phone", () => {
  it("activates a customer with the right code [AC-AUTH-08]", async () => {
    await register(validCustomer);
    const code = lastCodeSentTo("+233241234567");

    const response = await verifyPhone({ phone: "0241234567", code });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("ACTIVE");
    expect(response.body.data.phoneVerifiedAt).not.toBeNull();
  });

  it("accepts each code only once [AC-AUTH-08]", async () => {
    await register(validCustomer);
    const code = lastCodeSentTo("+233241234567");

    await verifyPhone({ phone: "0241234567", code });
    const secondTry = await verifyPhone({ phone: "0241234567", code });

    expect(secondTry.status).toBe(400);
    expect(secondTry.body.error.code).toBe("OTP_EXPIRED");
  });

  it("locks the code after 5 wrong attempts [AC-AUTH-09]", async () => {
    await register(validCustomer);
    const realCode = lastCodeSentTo("+233241234567");
    const wrongCode = realCode === "000000" ? "111111" : "000000";

    for (let attempt = 1; attempt <= 4; attempt++) {
      const response = await verifyPhone({ phone: "0241234567", code: wrongCode });
      expect(response.status).toBe(400);
    }

    const fifth = await verifyPhone({ phone: "0241234567", code: wrongCode });
    const withRealCode = await verifyPhone({ phone: "0241234567", code: realCode });

    expect(fifth.status).toBe(429);
    expect(withRealCode.status).toBe(429);
  });

  it("keeps restaurant owners waiting for approval after verifying [AC-AUTH-05]", async () => {
    await register({ ...validCustomer, role: "RESTAURANT_OWNER" });
    const code = lastCodeSentTo("+233241234567");

    const response = await verifyPhone({ phone: "0241234567", code });

    expect(response.body.data.status).toBe("PENDING_APPROVAL");
  });
});

describe("POST /api/v1/auth/resend-otp", () => {
  it("refuses a resend within 60 seconds [AC-AUTH-10]", async () => {
    await register(validCustomer);

    const response = await request(app)
      .post("/api/v1/auth/resend-otp")
      .send({ phone: "0241234567" });

    expect(response.status).toBe(429);
    expect(response.body.error.details[0].retryAfterSeconds).toBeGreaterThan(0);
  });
});
