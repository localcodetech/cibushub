import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { AuditLog, RefreshToken, RiderProfile, User } from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { TEST_PASSWORD, createTestUser } from "../helpers/users.js";
import { sentSms } from "../helpers/fakeSms.js";

vi.mock("../../src/sockets/disconnectUser.js", () => ({ disconnectUser: vi.fn() }));
const { disconnectUser } = await import("../../src/sockets/disconnectUser.js");

let admin;
let ama;

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
});

const names = (response) => response.body.data.map((user) => user.fullName);

beforeEach(async () => {
  vi.clearAllMocks();
  admin = await createTestUser({
    role: "ADMIN",
    fullName: "Ada Admin",
    email: "admin@example.com",
    phone: "+233200000001",
  });
  ama = await createTestUser({
    fullName: "Ama Owusu",
    email: "ama@example.com",
    phone: "+233241234567",
  });
  await createTestUser({
    role: "RESTAURANT_OWNER",
    fullName: "Kofi Mensah",
    email: "kofi@example.com",
    phone: "+233551112222",
    status: "PENDING_APPROVAL",
  });
});

describe("Finding users [AC-ADM-02]", () => {
  it("searches by name, email or phone (any format), and filters by role and status", async () => {
    const byName = await as(admin).get("/api/v1/admin/users?q=owusu");
    const byEmail = await as(admin).get("/api/v1/admin/users?q=kofi@");
    const byPhone = await as(admin).get("/api/v1/admin/users?q=024 123 4567");
    const owners = await as(admin).get("/api/v1/admin/users?role=RESTAURANT_OWNER");
    const pending = await as(admin).get("/api/v1/admin/users?status=PENDING_APPROVAL");

    expect(names(byName)).toEqual(["Ama Owusu"]);
    expect(names(byEmail)).toEqual(["Kofi Mensah"]);
    expect(names(byPhone)).toEqual(["Ama Owusu"]);
    expect(names(owners)).toEqual(["Kofi Mensah"]);
    expect(names(pending)).toEqual(["Kofi Mensah"]);
    expect(byName.body.data[0]).not.toHaveProperty("passwordHash");
  });

  it("shows one account with what goes with its role", async () => {
    const response = await as(admin).get(`/api/v1/admin/users/${ama.id}`);

    expect(response.body.data).toMatchObject({
      fullName: "Ama Owusu",
      orderCount: 0,
      canBeSuspended: true,
    });
  });
});

describe("Suspending and reactivating [AC-ADM-02, AC-ADM-07, AC-ADM-08]", () => {
  it("suspends with a reason: signed out everywhere, told by SMS, audited", async () => {
    // Ama is logged in on a device
    await request(app)
      .post("/api/v1/auth/login")
      .send({ identifier: "ama@example.com", password: TEST_PASSWORD });

    const response = await as(admin).post(`/api/v1/admin/users/${ama.id}/suspend`, {
      reason: "Several fake orders placed",
    });

    expect(response.status).toBe(200);
    expect((await User.findByPk(ama.id)).status).toBe("SUSPENDED");
    expect(await RefreshToken.count({ where: { userId: ama.id, revokedAt: null } })).toBe(0);
    expect(disconnectUser).toHaveBeenCalledWith(ama.id);
    expect(sentSms.at(-1).message).toContain("Several fake orders placed");
    const audit = await AuditLog.findOne({ where: { action: "USER_SUSPENDED" } });
    expect(audit).toMatchObject({ actorId: admin.id, targetId: ama.id });
    // And she can't use the app any more
    const me = await as(ama).get("/api/v1/auth/me");
    expect(me.status).toBe(403);
  });

  it("takes a suspended rider offline", async () => {
    const rider = await createTestUser({
      role: "RIDER",
      email: "yaw@example.com",
      phone: "+233241110000",
    });
    const profile = await RiderProfile.create({
      userId: rider.id,
      vehicleType: "BICYCLE",
      ghanaCardNumber: "GHA-123456789-0",
      status: "APPROVED",
      isOnline: true,
    });

    await as(admin).post(`/api/v1/admin/users/${rider.id}/suspend`, {
      reason: "Rude to several customers",
    });

    expect((await RiderProfile.findByPk(profile.id)).isOnline).toBe(false);
  });

  it("reactivates to the status it had before (e.g. still waiting for approval)", async () => {
    const kofi = await User.findOne({ where: { email: "kofi@example.com" } });
    await as(admin).post(`/api/v1/admin/users/${kofi.id}/suspend`, {
      reason: "Checking his documents",
    });

    const response = await as(admin).post(`/api/v1/admin/users/${kofi.id}/reactivate`, {
      reason: "Documents are fine after all",
    });

    expect(response.status).toBe(200);
    expect((await User.findByPk(kofi.id)).status).toBe("PENDING_APPROVAL");
    expect(await AuditLog.count({ where: { targetId: kofi.id } })).toBe(2);
  });

  it("needs a reason, refuses admins, and refuses twice", async () => {
    const noReason = await as(admin).post(`/api/v1/admin/users/${ama.id}/suspend`, {});
    const otherAdmin = await createTestUser({
      role: "ADMIN",
      email: "admin2@example.com",
      phone: "+233200000002",
    });
    const adminTarget = await as(admin).post(`/api/v1/admin/users/${otherAdmin.id}/suspend`, {
      reason: "Trying to suspend an admin",
    });
    await as(admin).post(`/api/v1/admin/users/${ama.id}/suspend`, { reason: "First suspension" });
    const again = await as(admin).post(`/api/v1/admin/users/${ama.id}/suspend`, {
      reason: "Second suspension",
    });
    const notSuspended = await as(admin).post(`/api/v1/admin/users/${admin.id}/reactivate`, {
      reason: "Not suspended at all",
    });

    expect(noReason.status).toBe(400);
    expect(adminTarget.status).toBe(403);
    expect(adminTarget.body.error.code).toBe("ADMIN_ACCOUNT");
    expect(again.body.error.code).toBe("ALREADY_SUSPENDED");
    expect(notSuspended.status).toBe(403);
  });

  it("is for admins only", async () => {
    const response = await as(ama).get("/api/v1/admin/users");

    expect(response.status).toBe(403);
  });
});
