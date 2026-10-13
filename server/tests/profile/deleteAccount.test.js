import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import {
  Address,
  AuditLog,
  OAuthAccount,
  Order,
  RefreshToken,
  RiderProfile,
  User,
} from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { TEST_PASSWORD, createTestUser } from "../helpers/users.js";
import { createOwner, createTestRestaurant } from "../helpers/restaurants.js";
import { createPaidOrder } from "../helpers/orders.js";
import { sentEmails } from "../helpers/fakeEmail.js";
import { sentSms } from "../helpers/fakeSms.js";

// Pretend Cloudinary and live connections: tests never touch either
vi.mock("../../src/services/upload/cloudinary.service.js", () => ({
  uploadPublicImage: vi.fn(),
  uploadPrivateDocument: vi.fn(),
  signedDocumentUrl: vi.fn(),
  deleteFromCloudinary: vi.fn(async () => {}),
}));
vi.mock("../../src/sockets/disconnectUser.js", () => ({ disconnectUser: vi.fn() }));
const { deleteFromCloudinary } = await import("../../src/services/upload/cloudinary.service.js");

// Restaurants are open on a Friday at noon (Accra), so test orders can be placed
const FRIDAY_NOON = new Date("2026-10-09T12:00:00Z");

const deleteAccount = (user, body) =>
  request(app)
    .post("/api/v1/auth/delete-account")
    .set("Cookie", `access_token=${signAccessToken(user)}`)
    .send(body);

// The row as it is now, deleted or not
const findAnyUser = (id) => User.findByPk(id, { paranoid: false });

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(FRIDAY_NOON);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("POST /api/v1/auth/delete-account", () => {
  it("requires a login [AC-RBAC-02]", async () => {
    const response = await request(app)
      .post("/api/v1/auth/delete-account")
      .send({ confirmText: "DELETE", password: TEST_PASSWORD });

    expect(response.status).toBe(401);
  });

  it("needs the word DELETE and the right password [AC-CUST-11]", async () => {
    const user = await createTestUser();

    const noWord = await deleteAccount(user, { confirmText: "delete", password: TEST_PASSWORD });
    const wrongPassword = await deleteAccount(user, {
      confirmText: "DELETE",
      password: "Wrong123",
    });
    const noPassword = await deleteAccount(user, { confirmText: "DELETE" });

    expect(noWord.status).toBe(400);
    expect(wrongPassword.status).toBe(400);
    expect(wrongPassword.body.error.details[0].field).toBe("password");
    expect(noPassword.body.error.details[0].message).toBe("Enter your password");
    expect((await findAnyUser(user.id)).deletedAt).toBeNull();
  });

  it("removes personal data but keeps past orders without it [AC-CUST-11]", async () => {
    const { order, customer, address } = await createPaidOrder();
    await order.update({ status: "DELIVERED", riderNote: "Call when you reach the gate" });
    await OAuthAccount.create({
      userId: customer.id,
      provider: "google",
      providerUserId: "google-123",
      email: customer.email,
    });
    await customer.update({ avatarUrl: "https://x/avatar.webp", avatarPublicId: "avatars/ama" });

    const response = await deleteAccount(customer, {
      confirmText: "DELETE",
      password: TEST_PASSWORD,
    });

    expect(response.status).toBe(200);
    // This browser is logged out
    expect(response.headers["set-cookie"].join(";")).toMatch(/access_token=;/);

    const erased = await findAnyUser(customer.id);
    expect(erased.deletedAt).not.toBeNull();
    expect(erased.fullName).toBe("Deleted user");
    expect(erased.email).toBe(`deleted-${customer.id}@deleted.invalid`);
    expect(erased.phone).toBeNull();
    expect(erased.avatarUrl).toBeNull();
    expect(deleteFromCloudinary).toHaveBeenCalledWith("avatars/ama");

    expect(await Address.findByPk(address.id)).toBeNull();
    expect(await OAuthAccount.count({ where: { userId: customer.id } })).toBe(0);
    expect(await RefreshToken.count({ where: { userId: customer.id } })).toBe(0);

    // The order is still there for the accounts, with no way back to the person
    const kept = await Order.findByPk(order.id);
    expect(kept.totalPesewas).toBe(order.totalPesewas);
    expect(kept.contactPhone).toBe("");
    expect(kept.deliveryLandmark).toBeNull();
    expect(kept.riderNote).toBeNull();
    expect(kept.deliveryLatitude).toBe(6.7);

    // One last email to the old address, and an audit entry
    expect(sentEmails.at(-1).to).toBe("ama1@example.com");
    expect(sentEmails.at(-1).subject).toBe("Your CibusHub account was deleted");
    expect(sentSms.at(-1).phone).toBe("+233551234561");
    expect(sentSms.at(-1).message).toMatch(/account has been deleted/);
    const audit = await AuditLog.findOne({ where: { targetId: customer.id } });
    expect(audit.action).toBe("ACCOUNT_DELETED");
    expect(audit.actorId).toBe(customer.id);
  });

  it("logs the deleted account out, and frees its phone and email for a new sign-up", async () => {
    const user = await createTestUser();
    await deleteAccount(user, { confirmText: "DELETE", password: TEST_PASSWORD });

    const me = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", `access_token=${signAccessToken(user)}`);
    expect(me.status).toBe(401);
    expect(await User.findOne({ where: { email: "user@example.com" } })).toBeNull();
    expect(await User.findOne({ where: { phone: "+233241234567" } })).toBeNull();
  });

  it("lets a Google / Apple account without a password confirm with the word alone", async () => {
    const user = await createTestUser({ passwordHash: null });

    const response = await deleteAccount(user, { confirmText: "DELETE" });

    expect(response.status).toBe(200);
    expect((await findAnyUser(user.id)).deletedAt).not.toBeNull();
  });

  it("waits while an order is still in progress [AC-CUST-11]", async () => {
    const { customer } = await createPaidOrder();

    const response = await deleteAccount(customer, {
      confirmText: "DELETE",
      password: TEST_PASSWORD,
    });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("ACCOUNT_HAS_OPEN_ORDERS");
    expect((await findAnyUser(customer.id)).fullName).toBe("Ama Owusu");
  });

  it("sends a restaurant owner with restaurants to support", async () => {
    const owner = await createOwner({ status: "ACTIVE" });
    await createTestRestaurant(owner, { status: "APPROVED" });

    const response = await deleteAccount(owner, {
      confirmText: "DELETE",
      password: TEST_PASSWORD,
    });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("ACCOUNT_HAS_RESTAURANTS");
  });

  it("clears a rider's Ghana Card and plate, keeping the profile row", async () => {
    const rider = await createTestUser({ role: "RIDER" });
    const profile = await RiderProfile.create({
      userId: rider.id,
      vehicleType: "MOTORBIKE",
      plateNumber: "GR 1234-26",
      ghanaCardNumber: "GHA-123456789-0",
      status: "APPROVED",
    });

    const response = await deleteAccount(rider, {
      confirmText: "DELETE",
      password: TEST_PASSWORD,
    });

    expect(response.status).toBe(200);
    await profile.reload();
    expect(profile.ghanaCardNumber).toMatch(/^DEL-/);
    expect(profile.plateNumber).toBeNull();
  });

  it("refuses admin accounts: the super admin removes those", async () => {
    const admin = await createTestUser({ role: "ADMIN" });

    const response = await deleteAccount(admin, {
      confirmText: "DELETE",
      password: TEST_PASSWORD,
    });

    expect(response.status).toBe(403);
  });
});

describe("POST /api/v1/admin/users/:userId/delete", () => {
  it("deletes an account for someone who asked, with a reason in the audit log [AC-CUST-11]", async () => {
    const admin = await createTestUser({
      role: "ADMIN",
      email: "admin@example.com",
      phone: "+233200000001",
    });
    const ama = await createTestUser({ email: "ama@example.com", phone: "+233551234567" });

    const response = await request(app)
      .post(`/api/v1/admin/users/${ama.id}/delete`)
      .set("Cookie", `access_token=${signAccessToken(admin)}`)
      .send({ reason: "Asked by email on 13 Oct 2026 to delete her account" });

    expect(response.status).toBe(200);
    expect((await findAnyUser(ama.id)).fullName).toBe("Deleted user");
    const audit = await AuditLog.findOne({ where: { targetId: ama.id } });
    expect(audit.actorId).toBe(admin.id);
    expect(audit.reason).toMatch(/Asked by email/);
  });
});
