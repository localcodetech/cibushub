import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { User } from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { createTestUser } from "../helpers/users.js";
import { lastCodeEmailedTo, sentEmails } from "../helpers/fakeEmail.js";

let ama;

const postAs = (user, path, body = {}) =>
  request(app)
    .post(path)
    .set("Cookie", `access_token=${signAccessToken(user)}`)
    .send(body);

beforeEach(async () => {
  ama = await createTestUser({ email: "ama@example.com", emailVerifiedAt: null });
});

describe("Confirming my email with a code [AC-AUTH-01]", () => {
  it("emails a 6-digit code to my own address", async () => {
    const response = await postAs(ama, "/api/v1/auth/email/send-code");

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ email: "ama@example.com" });
    expect(lastCodeEmailedTo("ama@example.com")).toMatch(/^\d{6}$/);
    expect(sentEmails.at(-1).text).toContain("confirm your email address");
  });

  it("the right code confirms the email", async () => {
    await postAs(ama, "/api/v1/auth/email/send-code");
    const code = lastCodeEmailedTo("ama@example.com");

    const response = await postAs(ama, "/api/v1/auth/email/verify", { code });

    expect(response.status).toBe(200);
    expect(response.body.data.emailVerifiedAt).toBeTruthy();
    expect(response.body.data).not.toHaveProperty("passwordHash");
    expect((await User.findByPk(ama.id)).emailVerifiedAt).not.toBeNull();
  });

  it("a wrong code changes nothing and says how many tries are left", async () => {
    await postAs(ama, "/api/v1/auth/email/send-code");
    const code = lastCodeEmailedTo("ama@example.com");
    const wrongCode = code === "000000" ? "111111" : "000000";

    const response = await postAs(ama, "/api/v1/auth/email/verify", { code: wrongCode });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("OTP_INVALID");
    expect((await User.findByPk(ama.id)).emailVerifiedAt).toBeNull();
  });

  it("a code for someone else's email doesn't work for mine", async () => {
    const kofi = await createTestUser({
      email: "kofi@example.com",
      phone: "+233551112222",
      emailVerifiedAt: null,
    });
    await postAs(kofi, "/api/v1/auth/email/send-code");
    const kofisCode = lastCodeEmailedTo("kofi@example.com");

    const response = await postAs(ama, "/api/v1/auth/email/verify", { code: kofisCode });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("OTP_EXPIRED"); // I never asked for one
  });

  it("waits a minute between codes", async () => {
    await postAs(ama, "/api/v1/auth/email/send-code");

    const again = await postAs(ama, "/api/v1/auth/email/send-code");

    expect(again.status).toBe(429);
    expect(again.body.error.code).toBe("RATE_LIMITED");
  });

  it("refuses when the email is already confirmed, and needs a login", async () => {
    await ama.update({ emailVerifiedAt: new Date() });

    const confirmed = await postAs(ama, "/api/v1/auth/email/send-code");
    const guest = await request(app).post("/api/v1/auth/email/send-code");

    expect(confirmed.status).toBe(409);
    expect(confirmed.body.error.code).toBe("EMAIL_ALREADY_VERIFIED");
    expect(guest.status).toBe(401);
  });
});
