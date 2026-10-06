import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { User } from "../../src/models/index.js";
import { cookieValue, createTestUser, TEST_PASSWORD } from "../helpers/users.js";

const login = (agent, identifier, password = TEST_PASSWORD) =>
  agent.post("/api/v1/auth/login").send({ identifier, password });

describe("POST /api/v1/auth/login", () => {
  it("logs in by email and sets HttpOnly cookies, not tokens in the body [AC-AUTH-11]", async () => {
    await createTestUser();

    const response = await login(request(app), "user@example.com");

    expect(response.status).toBe(200);
    const cookies = response.headers["set-cookie"].join(" ");
    expect(cookies).toContain("access_token=");
    expect(cookies).toContain("refresh_token=");
    expect(cookies).toContain("HttpOnly");
    expect(cookies).toContain("SameSite=Lax");
    expect(JSON.stringify(response.body)).not.toContain(cookieValue(response, "access_token"));
  });

  it("logs in by phone in local format [AC-AUTH-11, AC-AUTH-04]", async () => {
    await createTestUser();

    const response = await login(request(app), "024 123 4567");

    expect(response.status).toBe(200);
  });

  it("gives the same answer for a wrong password and an unknown account [AC-AUTH-12]", async () => {
    await createTestUser();

    const wrongPassword = await login(request(app), "user@example.com", "Wrong123");
    const unknownAccount = await login(request(app), "ghost@example.com", "Wrong123");

    expect(wrongPassword.status).toBe(401);
    expect(unknownAccount.status).toBe(401);
    expect(wrongPassword.body.error).toEqual(unknownAccount.body.error);
  });

  it("refuses suspended accounts [AC-AUTH-17]", async () => {
    await createTestUser({ status: "SUSPENDED" });

    const response = await login(request(app), "user@example.com");

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("ACCOUNT_SUSPENDED");
  });

  it("blocks an account after 5 failed logins, by email or phone [AC-AUTH-13]", async () => {
    await createTestUser();

    const identifiers = [
      "user@example.com",
      "0241234567",
      "user@example.com",
      "0241234567",
      "user@example.com",
    ];
    for (const identifier of identifiers) {
      const response = await login(request(app), identifier, "Wrong123");
      expect(response.status).toBe(401);
    }

    const rightPassword = await login(request(app), "0241234567");

    expect(rightPassword.status).toBe(429);
    expect(rightPassword.body.error.code).toBe("RATE_LIMITED");
  });
});

describe("GET /api/v1/auth/me", () => {
  it("returns 401 without a login [AC-RBAC-02]", async () => {
    const response = await request(app).get("/api/v1/auth/me");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns the logged-in user without the password hash [AC-SEC-08]", async () => {
    await createTestUser();
    const browser = request.agent(app);
    await login(browser, "user@example.com");

    const response = await browser.get("/api/v1/auth/me");

    expect(response.status).toBe(200);
    expect(response.body.data.email).toBe("user@example.com");
    expect(response.body.data.passwordHash).toBeUndefined();
  });

  it("blocks a suspended user on their very next request [AC-AUTH-17]", async () => {
    const user = await createTestUser();
    const browser = request.agent(app);
    await login(browser, "user@example.com");

    await user.update({ status: "SUSPENDED" });
    const response = await browser.get("/api/v1/auth/me");

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("ACCOUNT_SUSPENDED");
  });

  it("rejects a forged token [AC-RBAC-02]", async () => {
    const response = await request(app)
      .get("/api/v1/auth/me")
      .set(
        "Cookie",
        "access_token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4Iiwicm9sZSI6IkFETUlOIn0.forged",
      );

    expect(response.status).toBe(401);
  });
});

describe("POST /api/v1/auth/refresh", () => {
  it("swaps the refresh cookie for a new one [AC-AUTH-14]", async () => {
    await createTestUser();
    const loginResponse = await login(request(app), "user@example.com");
    const oldRefresh = cookieValue(loginResponse, "refresh_token");

    const response = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", `refresh_token=${oldRefresh}`);

    expect(response.status).toBe(200);
    expect(cookieValue(response, "refresh_token")).toBeDefined();
    expect(cookieValue(response, "refresh_token")).not.toBe(oldRefresh);
  });

  it("treats reuse of an old refresh token as theft and ends the session [AC-AUTH-15]", async () => {
    await createTestUser();
    const loginResponse = await login(request(app), "user@example.com");
    const firstToken = cookieValue(loginResponse, "refresh_token");

    const refreshed = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", `refresh_token=${firstToken}`);
    const newestToken = cookieValue(refreshed, "refresh_token");

    const reuse = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", `refresh_token=${firstToken}`);
    const newestAfterTheft = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", `refresh_token=${newestToken}`);

    expect(reuse.status).toBe(401);
    expect(newestAfterTheft.status).toBe(401);
  });

  it("returns 401 without a refresh cookie", async () => {
    const response = await request(app).post("/api/v1/auth/refresh");

    expect(response.status).toBe(401);
  });
});

describe("POST /api/v1/auth/logout", () => {
  it("ends this device's session and clears cookies, other devices stay logged in [AC-AUTH-16]", async () => {
    await createTestUser();
    const laptop = request.agent(app);
    const phone = request.agent(app);
    const laptopLogin = await login(laptop, "user@example.com");
    await login(phone, "user@example.com");
    const laptopRefresh = cookieValue(laptopLogin, "refresh_token");

    const response = await laptop.post("/api/v1/auth/logout");

    expect(response.status).toBe(200);
    expect(response.headers["set-cookie"].join(" ")).toContain("Expires=Thu, 01 Jan 1970");

    const stolenCopy = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", `refresh_token=${laptopRefresh}`);
    expect(stolenCopy.status).toBe(401);

    const phoneMe = await phone.get("/api/v1/auth/me");
    expect(phoneMe.status).toBe(200);
  });

  it("always succeeds, even without a cookie", async () => {
    const response = await request(app).post("/api/v1/auth/logout");

    expect(response.status).toBe(200);
    expect(await User.count()).toBe(0);
  });
});
