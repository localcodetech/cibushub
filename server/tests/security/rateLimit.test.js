import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { globalLimitFor, globalLimitKey } from "../../src/middlewares/rateLimit/globalLimiter.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { createTestUser } from "../helpers/users.js";

// A request as the global limit sees it: an IP address and, maybe, a login cookie
const fakeRequest = (cookies = {}) => ({ ip: "102.176.1.20", cookies });

describe("global rate limit [AC-SEC-04]", () => {
  it("gives each logged-in account its own budget, even on a shared IP", async () => {
    const kofi = await createTestUser();
    const ama = await createTestUser({ email: "ama@example.com", phone: "+233241234568" });

    const kofiRequest = fakeRequest({ access_token: signAccessToken(kofi) });
    const amaRequest = fakeRequest({ access_token: signAccessToken(ama) });

    expect(globalLimitKey(kofiRequest)).toBe(`user:${kofi.id}`);
    expect(globalLimitKey(amaRequest)).toBe(`user:${ama.id}`);
    expect(globalLimitFor(kofiRequest)).toBe(200);
  });

  it("counts guests by IP address, at 100 a minute", () => {
    const guest = fakeRequest();

    expect(globalLimitKey(guest)).toBe("ip:102.176.1.20");
    expect(globalLimitFor(guest)).toBe(100);
  });

  it("treats a made-up login cookie as a guest", () => {
    const forged = fakeRequest({ access_token: "not-a-real-token" });

    expect(globalLimitKey(forged)).toBe("ip:102.176.1.20");
    expect(globalLimitFor(forged)).toBe(100);
  });
});

describe("checkout rate limits [AC-SEC-04]", () => {
  it("stops an 11th order attempt within 10 minutes", async () => {
    const customer = await createTestUser();
    const placeOrder = () =>
      request(app)
        .post("/api/v1/customer/orders")
        .set("Cookie", `access_token=${signAccessToken(customer)}`)
        .send({});

    // The limit comes before the checks, so even broken attempts count
    for (let attempt = 1; attempt <= 10; attempt += 1) {
      const response = await placeOrder();
      expect(response.status).toBe(400);
    }

    const eleventh = await placeOrder();
    expect(eleventh.status).toBe(429);
    expect(eleventh.body.error.code).toBe("RATE_LIMITED");
  });

  it("keeps each customer's order limit separate", async () => {
    const kofi = await createTestUser();
    const ama = await createTestUser({ email: "ama@example.com", phone: "+233241234568" });
    const placeOrderAs = (user) =>
      request(app)
        .post("/api/v1/customer/orders")
        .set("Cookie", `access_token=${signAccessToken(user)}`)
        .send({});

    for (let attempt = 1; attempt <= 10; attempt += 1) {
      await placeOrderAs(kofi);
    }

    expect((await placeOrderAs(kofi)).status).toBe(429);
    expect((await placeOrderAs(ama)).status).toBe(400);
  });
});
