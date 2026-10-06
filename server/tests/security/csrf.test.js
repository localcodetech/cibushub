import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import env from "../../src/config/env/env.js";
import { createTestUser, TEST_PASSWORD } from "../helpers/users.js";

const loginFrom = (origin) => {
  const call = request(app)
    .post("/api/v1/auth/login")
    .send({ identifier: "user@example.com", password: TEST_PASSWORD });

  return origin ? call.set("Origin", origin) : call;
};

describe("CSRF origin check [AC-SEC-03]", () => {
  it("refuses a change sent from another website", async () => {
    await createTestUser();

    const response = await loginFrom("https://evil-site.example");

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("allows the React app", async () => {
    await createTestUser();

    const response = await loginFrom(env.CLIENT_URL);

    expect(response.status).toBe(200);
  });

  it("allows non-browser clients that send no Origin", async () => {
    await createTestUser();

    const response = await loginFrom(undefined);

    expect(response.status).toBe(200);
  });

  it("lets read-only requests from anywhere through", async () => {
    const response = await request(app)
      .get("/api/health")
      .set("Origin", "https://evil-site.example");

    expect(response.status).not.toBe(403);
  });

  it("blocks a logged-in user's password change triggered by another website", async () => {
    await createTestUser();
    const browser = request.agent(app);
    await browser
      .post("/api/v1/auth/login")
      .send({ identifier: "user@example.com", password: TEST_PASSWORD });

    const response = await browser
      .post("/api/v1/auth/change-password")
      .set("Origin", "https://evil-site.example")
      .send({ currentPassword: TEST_PASSWORD, newPassword: "Hacked123" });

    expect(response.status).toBe(403);
    expect((await loginFrom(env.CLIENT_URL)).status).toBe(200);
  });
});
