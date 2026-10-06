import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { lastCodeSentTo, sentSms } from "../helpers/fakeSms.js";
import { createTestUser, TEST_PASSWORD } from "../helpers/users.js";

const PHONE = "+233241234567";

const login = (agent, password = TEST_PASSWORD) =>
  agent.post("/api/v1/auth/login").send({ identifier: "user@example.com", password });

const forgotPassword = (identifier) =>
  request(app).post("/api/v1/auth/forgot-password").send({ identifier });

const resetPassword = (body) => request(app).post("/api/v1/auth/reset-password").send(body);

describe("POST /api/v1/auth/forgot-password", () => {
  it("gives the same reply whether or not the account exists [AC-AUTH-18]", async () => {
    await createTestUser();

    const existing = await forgotPassword("user@example.com");
    const unknown = await forgotPassword("ghost@example.com");

    expect(existing.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(existing.body).toEqual(unknown.body);
  });

  it("texts a reset code only to a real account's phone [AC-AUTH-18]", async () => {
    await createTestUser();

    await forgotPassword("user@example.com");
    await forgotPassword("ghost@example.com");

    expect(sentSms).toHaveLength(1);
    expect(sentSms[0].phone).toBe(PHONE);
    expect(sentSms[0].message).toContain("password reset code");
  });
});

describe("POST /api/v1/auth/reset-password", () => {
  it("sets the new password, logs out every device and sends a notice [AC-AUTH-19]", async () => {
    await createTestUser();
    const browser = request.agent(app);
    await login(browser);
    await forgotPassword("user@example.com");
    const code = lastCodeSentTo(PHONE);

    const response = await resetPassword({
      identifier: "user@example.com",
      code,
      newPassword: "NewPass1",
    });

    expect(response.status).toBe(200);
    expect((await browser.post("/api/v1/auth/refresh")).status).toBe(401);
    expect((await login(request(app))).status).toBe(401);
    expect((await login(request(app), "NewPass1")).status).toBe(200);
    expect(sentSms.at(-1).message).toContain("password was just changed");
  });

  it("rejects a wrong code without changing the password [AC-AUTH-19]", async () => {
    await createTestUser();
    await forgotPassword("user@example.com");

    const response = await resetPassword({
      identifier: "user@example.com",
      code: "000000",
      newPassword: "NewPass1",
    });

    expect(response.status).toBe(400);
    expect((await login(request(app))).status).toBe(200);
  });

  it("rejects a weak new password [AC-AUTH-03]", async () => {
    await createTestUser();
    await forgotPassword("user@example.com");

    const response = await resetPassword({
      identifier: "user@example.com",
      code: lastCodeSentTo(PHONE),
      newPassword: "weak",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("does not accept a phone verification code as a reset code", async () => {
    await createTestUser({ status: "PENDING_VERIFICATION" });
    await request(app).post("/api/v1/auth/resend-otp").send({ phone: PHONE });
    const verifyCode = lastCodeSentTo(PHONE);

    const response = await resetPassword({
      identifier: "user@example.com",
      code: verifyCode,
      newPassword: "NewPass1",
    });

    expect(response.status).toBe(400);
  });
});

describe("POST /api/v1/auth/change-password", () => {
  it("requires a login [AC-RBAC-02]", async () => {
    const response = await request(app)
      .post("/api/v1/auth/change-password")
      .send({ currentPassword: TEST_PASSWORD, newPassword: "NewPass1" });

    expect(response.status).toBe(401);
  });

  it("checks the current password first [AC-AUTH-20]", async () => {
    await createTestUser();
    const browser = request.agent(app);
    await login(browser);

    const response = await browser
      .post("/api/v1/auth/change-password")
      .send({ currentPassword: "Wrong123", newPassword: "NewPass1" });

    expect(response.status).toBe(400);
    expect(response.body.error.details[0].field).toBe("currentPassword");
  });

  it("changes the password, keeps this device and logs out the others [AC-AUTH-20]", async () => {
    await createTestUser();
    const thisDevice = request.agent(app);
    const otherDevice = request.agent(app);
    await login(thisDevice);
    await login(otherDevice);

    const response = await thisDevice
      .post("/api/v1/auth/change-password")
      .send({ currentPassword: TEST_PASSWORD, newPassword: "NewPass1" });

    expect(response.status).toBe(200);
    expect((await thisDevice.post("/api/v1/auth/refresh")).status).toBe(200);
    expect((await otherDevice.post("/api/v1/auth/refresh")).status).toBe(401);
    expect((await login(request(app), "NewPass1")).status).toBe(200);
  });

  it("refuses a new password equal to the current one", async () => {
    await createTestUser();
    const browser = request.agent(app);
    await login(browser);

    const response = await browser
      .post("/api/v1/auth/change-password")
      .send({ currentPassword: TEST_PASSWORD, newPassword: TEST_PASSWORD });

    expect(response.status).toBe(400);
  });
});
