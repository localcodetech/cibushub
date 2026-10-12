import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { AuditLog, RefreshToken, User } from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { TEST_PASSWORD, createTestUser } from "../helpers/users.js";

vi.mock("../../src/sockets/disconnectUser.js", () => ({ disconnectUser: vi.fn() }));

let boss;
let admin;

const url = "/api/v1/super-admin/admins";

const as = (user) => ({
  get: (path) =>
    request(app)
      .get(path)
      .set("Cookie", `access_token=${signAccessToken(user)}`),
  post: (path, body = {}) =>
    request(app)
      .post(path)
      .set("Cookie", `access_token=${signAccessToken(user)}`)
      .send(body),
  patch: (path, body = {}) =>
    request(app)
      .patch(path)
      .set("Cookie", `access_token=${signAccessToken(user)}`)
      .send(body),
});

const newAdmin = {
  fullName: "Esi Admin",
  email: "esi@example.com",
  phone: "055 222 3333",
  password: "Strong2026!",
};

beforeEach(async () => {
  boss = await createTestUser({
    role: "SUPER_ADMIN",
    fullName: "Sam Super",
    email: "super@example.com",
    phone: "+233200000002",
  });
  admin = await createTestUser({
    role: "ADMIN",
    fullName: "Ada Admin",
    email: "admin@example.com",
    phone: "+233200000001",
  });
});

describe("Only super admins manage admins [AC-SADM-01]", () => {
  it("creates an admin who can log in at once, audited", async () => {
    const response = await as(boss).post(url, newAdmin);
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: "esi@example.com", password: "Strong2026!" });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      role: "ADMIN",
      status: "ACTIVE",
      phone: "+233552223333",
    });
    expect(response.body.data).not.toHaveProperty("passwordHash");
    expect(login.status).toBe(200);
    expect(await AuditLog.count({ where: { action: "ADMIN_CREATED", actorId: boss.id } })).toBe(1);
  });

  it("lists admins and super admins only", async () => {
    await createTestUser({ email: "ama@example.com", phone: "+233241234567" });

    const response = await as(boss).get(url);

    expect(response.body.data.map((user) => user.role).sort()).toEqual(["ADMIN", "SUPER_ADMIN"]);
  });

  it("an admin (not super) can't do any of it", async () => {
    const list = await as(admin).get(url);
    const create = await as(admin).post(url, newAdmin);

    expect([list.status, create.status]).toEqual([403, 403]);
  });

  it("suspends an admin (signed out everywhere) and reactivates them", async () => {
    await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: "admin@example.com", password: TEST_PASSWORD });

    const suspended = await as(boss).post(`${url}/${admin.id}/suspend`, {
      reason: "Left the company today",
    });
    const tokensLeft = await RefreshToken.count({ where: { userId: admin.id, revokedAt: null } });
    const reactivated = await as(boss).post(`${url}/${admin.id}/reactivate`, {
      reason: "Back from leave this week",
    });

    expect(suspended.body.data.status).toBe("SUSPENDED");
    expect(tokensLeft).toBe(0);
    expect(reactivated.body.data.status).toBe("ACTIVE");
    // Written in the same second, so compared without relying on their order
    const audits = await AuditLog.findAll({ where: { targetId: admin.id } });
    expect(audits.map((audit) => [audit.action, audit.actorId, audit.reason]).sort()).toEqual([
      ["ADMIN_REACTIVATED", boss.id, "Back from leave this week"],
      ["ADMIN_SUSPENDED", boss.id, "Left the company today"],
    ]);
  });

  it("promotes an admin to super admin, and removes an admin (kept for history)", async () => {
    const promoted = await as(boss).patch(`${url}/${admin.id}/role`, {
      role: "SUPER_ADMIN",
      reason: "Now runs operations",
    });
    const other = await createTestUser({
      role: "ADMIN",
      email: "other@example.com",
      phone: "+233200000003",
    });
    const removed = await as(boss).post(`${url}/${other.id}/remove`, {
      reason: "Account no longer needed",
    });

    expect(promoted.body.data.role).toBe("SUPER_ADMIN");
    expect(await AuditLog.findOne({ where: { targetId: admin.id } })).toMatchObject({
      action: "ADMIN_ROLE_CHANGED",
      actorId: boss.id,
      before: { role: "ADMIN" },
      after: { role: "SUPER_ADMIN" },
    });
    expect(await AuditLog.findOne({ where: { targetId: other.id } })).toMatchObject({
      action: "ADMIN_REMOVED",
      actorId: boss.id,
    });
    expect(removed.body.data).toEqual({ id: other.id, removed: true });
    expect(await User.findByPk(other.id)).toBeNull();
    expect(await User.findByPk(other.id, { paranoid: false })).not.toBeNull();
  });

  it("won't reuse a removed admin's email", async () => {
    const other = await createTestUser({
      role: "ADMIN",
      email: "esi@example.com",
      phone: "+233200000003",
    });
    await as(boss).post(`${url}/${other.id}/remove`, { reason: "Account no longer needed" });

    const response = await as(boss).post(url, newAdmin);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("ACCOUNT_EXISTS");
  });
});

describe("The last super admin is protected [AC-SADM-04]", () => {
  it("nobody can act on their own account", async () => {
    const response = await as(boss).post(`${url}/${boss.id}/suspend`, {
      reason: "Suspending myself",
    });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("OWN_ACCOUNT");
  });

  it("two super admins demoting each other at the same moment: one wins, one is refused", async () => {
    const second = await createTestUser({
      role: "SUPER_ADMIN",
      email: "super2@example.com",
      phone: "+233200000004",
    });

    const results = await Promise.all([
      as(boss).patch(`${url}/${second.id}/role`, { role: "ADMIN", reason: "Only one is needed" }),
      as(second).patch(`${url}/${boss.id}/role`, { role: "ADMIN", reason: "Only one is needed" }),
    ]);

    // One went through; the other (or its user, already demoted) was refused
    const statuses = results.map((result) => result.status).sort();
    expect(statuses[0]).toBe(200);
    expect([403, 409]).toContain(statuses[1]);
    // Never zero super admins
    expect(await User.count({ where: { role: "SUPER_ADMIN", status: "ACTIVE" } })).toBe(1);
  });

  it("refuses LAST_SUPER_ADMIN when the target is the only active one left", async () => {
    const { suspendAdmin } = await import("../../src/services/superAdmin/manageAdmins.service.js");
    // A super admin whose own account was suspended a moment ago (their request is
    // already past the login check) tries to suspend the only active one left
    const leaving = await createTestUser({
      role: "SUPER_ADMIN",
      status: "SUSPENDED",
      email: "leaving@example.com",
      phone: "+233200000006",
    });

    await expect(
      suspendAdmin({ id: leaving.id, ipAddress: "10.0.0.1" }, boss.id, "Last one standing"),
    ).rejects.toMatchObject({ statusCode: 409, code: "LAST_SUPER_ADMIN" });
  });
});
