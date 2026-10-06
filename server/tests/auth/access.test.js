import { beforeAll, describe, expect, it } from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import authenticate from "../../src/middlewares/authenticate.js";
import requireActive from "../../src/middlewares/requireActive.js";
import authorize from "../../src/middlewares/authorize.js";
import errorHandler from "../../src/middlewares/errorHandler.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { createTestUser } from "../helpers/users.js";

let testApp;

beforeAll(() => {
  testApp = express();
  testApp.use(cookieParser());
  testApp.use((req, res, next) => {
    req.log = { error: () => {} };
    next();
  });

  const allowed = (req, res) => res.json({ success: true });

  testApp.get("/customer-area", authenticate, requireActive, authorize("CUSTOMER"), allowed);
  testApp.get(
    "/admin-area",
    authenticate,
    requireActive,
    authorize("ADMIN", "SUPER_ADMIN"),
    allowed,
  );

  testApp.use(errorHandler);
});

const visit = (path, user) => {
  const call = request(testApp).get(path);
  return user ? call.set("Cookie", `access_token=${signAccessToken(user)}`) : call;
};

describe("Protected routes", () => {
  it("returns 401 when not logged in [AC-RBAC-02]", async () => {
    const response = await visit("/customer-area");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("lets an active customer into the customer area", async () => {
    const customer = await createTestUser();

    const response = await visit("/customer-area", customer);

    expect(response.status).toBe(200);
  });

  it("returns 403 FORBIDDEN for the wrong role [AC-RBAC-01]", async () => {
    const customer = await createTestUser();

    const response = await visit("/admin-area", customer);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("lets admins and super admins into the admin area [AC-RBAC-01]", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    const superAdmin = await createTestUser({
      role: "SUPER_ADMIN",
      email: "super@example.com",
      phone: "+233551112222",
    });

    expect((await visit("/admin-area", admin)).status).toBe(200);
    expect((await visit("/admin-area", superAdmin)).status).toBe(200);
  });

  it("blocks unverified customers until they verify their phone", async () => {
    const unverified = await createTestUser({ status: "PENDING_VERIFICATION" });

    const response = await visit("/customer-area", unverified);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("ACCOUNT_NOT_VERIFIED");
  });

  it("blocks restaurant owners waiting for approval [AC-AUTH-05]", async () => {
    const owner = await createTestUser({ role: "RESTAURANT_OWNER", status: "PENDING_APPROVAL" });

    const response = await visit("/customer-area", owner);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("ACCOUNT_PENDING_APPROVAL");
  });

  it("blocks suspended users even with a valid token [AC-AUTH-17]", async () => {
    const suspended = await createTestUser({ status: "SUSPENDED" });

    const response = await visit("/customer-area", suspended);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("ACCOUNT_SUSPENDED");
  });

  it("uses the role from the database, not from the token", async () => {
    const customer = await createTestUser();
    const tokenClaimingAdmin = signAccessToken({ id: customer.id, role: "ADMIN" });

    const response = await request(testApp)
      .get("/admin-area")
      .set("Cookie", `access_token=${tokenClaimingAdmin}`);

    expect(response.status).toBe(403);
  });
});
