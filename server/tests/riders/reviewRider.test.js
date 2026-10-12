import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { AuditLog, RiderDocument, RiderProfile, User } from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { createTestUser } from "../helpers/users.js";
import { sentSms } from "../helpers/fakeSms.js";
import { saveLatestLocation } from "../../src/services/rider/riderLocationStore.js";
import { sentEmails } from "../helpers/fakeEmail.js";

vi.mock("../../src/services/upload/cloudinary.service.js", () => ({
  uploadPublicImage: vi.fn(),
  uploadPrivateDocument: vi.fn(),
  signedDocumentUrl: vi.fn((publicId) => `https://signed.example/${publicId}?expires=300`),
  deleteFromCloudinary: vi.fn(async () => {}),
}));
vi.mock("../../src/sockets/emitAdminAlert.js", () => ({ emitAdminAlert: vi.fn() }));

let admin;
let rider;
let profile;

// A rider who submitted a complete motorbike application
const createApplicant = async (overrides = {}) => {
  const user = await createTestUser({
    role: "RIDER",
    status: "PENDING_APPROVAL",
    fullName: "Yaw Mensah",
    email: overrides.email || "yaw.rider@example.com",
    phone: overrides.phone || "+233241110000",
    phoneVerifiedAt: new Date(),
    avatarUrl: "https://res.cloudinary.com/demo/avatars/yaw.webp",
  });
  const application = await RiderProfile.create({
    userId: user.id,
    vehicleType: "MOTORBIKE",
    plateNumber: "M-21-GR 1234",
    ghanaCardNumber: overrides.ghanaCardNumber || "GHA-123456789-0",
    status: overrides.status || "PENDING_APPROVAL",
    submittedAt: overrides.submittedAt || new Date(),
  });
  return { user, application };
};

beforeEach(async () => {
  sentSms.length = 0;
  admin = await createTestUser({
    role: "ADMIN",
    email: "admin@example.com",
    phone: "+233200000001",
  });
  ({ user: rider, application: profile } = await createApplicant());
});

const adminUrl = "/api/v1/admin/riders";
const as = (user) => ({
  get: (path) =>
    request(app)
      .get(path)
      .set("Cookie", `access_token=${signAccessToken(user)}`),
  post: (path, body) =>
    request(app)
      .post(path)
      .set("Cookie", `access_token=${signAccessToken(user)}`)
      .send(body),
});

describe("Review queue [AC-RIDER-02]", () => {
  it("lists submitted applications oldest first, and hides drafts", async () => {
    const { application: older } = await createApplicant({
      email: "ama.rider@example.com",
      phone: "+233241110001",
      ghanaCardNumber: "GHA-111111111-1",
      submittedAt: new Date("2026-10-01T10:00:00Z"),
    });
    await createApplicant({
      email: "kojo.rider@example.com",
      phone: "+233241110002",
      ghanaCardNumber: "GHA-222222222-2",
      status: "DRAFT",
    });

    const response = await as(admin).get(`${adminUrl}?status=PENDING_APPROVAL`);
    const everything = await as(admin).get(adminUrl);

    expect(response.status).toBe(200);
    expect(response.body.data.map((item) => item.id)).toEqual([older.id, profile.id]);
    expect(response.body.data[1].rider).toMatchObject({
      fullName: "Yaw Mensah",
      phone: rider.phone,
      accountStatus: "PENDING_APPROVAL",
    });
    expect(everything.body.data.every((item) => item.status !== "DRAFT")).toBe(true);
  });

  it("shows documents to admins through 5-minute links", async () => {
    await RiderDocument.create({
      riderProfileId: profile.id,
      documentType: "GHANA_CARD",
      publicId: "riders/x/doc-1",
      format: "pdf",
    });

    const response = await as(admin).get(`${adminUrl}/${profile.id}/documents`);

    expect(response.body.data).toEqual([
      expect.objectContaining({
        documentType: "GHANA_CARD",
        url: "https://signed.example/riders/x/doc-1?expires=300",
      }),
    ]);
  });

  it("is for admins only", async () => {
    const response = await as(rider).get(adminUrl);

    expect(response.status).toBe(403);
  });
});

describe("Approve, reject, suspend [AC-RIDER-02, AC-ADM-07]", () => {
  it("approves: the rider's account opens, they get an SMS and email, and it is audited [AC-NOTIF-01]", async () => {
    const response = await as(admin).post(`${adminUrl}/${profile.id}/approve`);

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("APPROVED");
    expect(response.body.data.approvedAt).toBeTruthy();
    expect((await User.findByPk(rider.id)).status).toBe("ACTIVE");
    expect(sentSms.at(-1)).toMatchObject({ phone: rider.phone });
    expect(sentSms.at(-1).message).toContain("approved");
    expect(sentEmails.at(-1)).toMatchObject({ to: rider.email });
    expect(sentEmails.at(-1).subject).toContain("approved");
    const audit = await AuditLog.findOne({ where: { targetId: profile.id } });
    expect(audit).toMatchObject({ action: "RIDER_APPROVED", actorId: admin.id });
  });

  it("rejects with a reason the rider sees", async () => {
    const response = await as(admin).post(`${adminUrl}/${profile.id}/reject`, {
      reason: "The Ghana Card photo is blurry",
    });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      status: "REJECTED",
      rejectionReason: "The Ghana Card photo is blurry",
    });
    expect(sentSms.at(-1).message).toContain("The Ghana Card photo is blurry");
    expect(sentEmails.at(-1).text).toContain("The Ghana Card photo is blurry");
    expect(sentEmails.at(-1).html).toContain("/rider/apply"); // the fix-and-resubmit button
    // Still waiting: a rejected rider can't work
    expect((await User.findByPk(rider.id)).status).toBe("PENDING_APPROVAL");
    expect(await AuditLog.findOne({ where: { targetId: profile.id } })).toMatchObject({
      action: "RIDER_REJECTED",
      actorId: admin.id,
      reason: "The Ghana Card photo is blurry",
    });
  });

  it("needs a clear reason to reject or suspend", async () => {
    const response = await as(admin).post(`${adminUrl}/${profile.id}/reject`, { reason: "no" });

    expect(response.status).toBe(400);
  });

  it("suspends an approved rider, and can reinstate them", async () => {
    await as(admin).post(`${adminUrl}/${profile.id}/approve`);

    const suspended = await as(admin).post(`${adminUrl}/${profile.id}/suspend`, {
      reason: "Several customers reported rude behaviour",
    });
    const reinstated = await as(admin).post(`${adminUrl}/${profile.id}/approve`);

    expect(suspended.body.data.status).toBe("SUSPENDED");
    expect(reinstated.body.data.status).toBe("APPROVED");
    // All written in the same second, so compared without relying on their order
    const audits = await AuditLog.findAll({ where: { targetId: profile.id } });
    expect(audits.map((audit) => audit.action).sort()).toEqual([
      "RIDER_APPROVED",
      "RIDER_APPROVED",
      "RIDER_SUSPENDED",
    ]);
  });

  it("refuses moves that make no sense", async () => {
    const suspendPending = await as(admin).post(`${adminUrl}/${profile.id}/suspend`, {
      reason: "Several customers reported rude behaviour",
    });
    await as(admin).post(`${adminUrl}/${profile.id}/approve`);
    const rejectApproved = await as(admin).post(`${adminUrl}/${profile.id}/reject`, {
      reason: "The Ghana Card photo is blurry",
    });

    expect(suspendPending.status).toBe(409);
    expect(rejectApproved.status).toBe(409);
    expect(rejectApproved.body.error.code).toBe("INVALID_STATUS_TRANSITION");
  });

  it("answers 404 for a rider that doesn't exist", async () => {
    const response = await as(admin).post(
      `${adminUrl}/00000000-0000-4000-8000-000000000000/approve`,
    );

    expect(response.status).toBe(404);
  });
});

describe("One Ghana Card, one rider", () => {
  it("refuses a Ghana Card already on another rider's application", async () => {
    const other = await createTestUser({
      role: "RIDER",
      status: "PENDING_APPROVAL",
      email: "kofi.rider@example.com",
      phone: "+233241119999",
      phoneVerifiedAt: new Date(),
    });

    const response = await request(app)
      .put("/api/v1/rider/application")
      .set("Cookie", `access_token=${signAccessToken(other)}`)
      .send({ vehicleType: "BICYCLE", ghanaCardNumber: "gha-123456789-0" });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("GHANA_CARD_TAKEN");
  });

  it("lets a rider save their own card again", async () => {
    await profile.update({ status: "DRAFT" });

    const response = await request(app)
      .put("/api/v1/rider/application")
      .set("Cookie", `access_token=${signAccessToken(rider)}`)
      .send({ vehicleType: "BICYCLE", ghanaCardNumber: "GHA-123456789-0" });

    expect(response.status).toBe(200);
  });
});

describe("Ghana Card privacy [plan-review Step 13, AC-ADM-07]", () => {
  it("lists and details show it masked", async () => {
    const list = await as(admin).get(adminUrl);
    const one = await as(admin).get(`${adminUrl}/${profile.id}`);

    expect(list.body.data[0].ghanaCardNumber).toBe("GHA-•••••••89-0");
    expect(one.body.data.ghanaCardNumber).toBe("GHA-•••••••89-0");
  });

  it("the full number is one audited reveal away", async () => {
    const response = await as(admin).post(`${adminUrl}/${profile.id}/ghana-card/reveal`);

    expect(response.body.data).toEqual({ ghanaCardNumber: "GHA-123456789-0" });
    const audit = await AuditLog.findOne({ where: { action: "RIDER_GHANA_CARD_REVEALED" } });
    expect(audit).toMatchObject({ actorId: admin.id, targetId: profile.id });
  });
});

describe("Live map of online riders [AC-ADM-04]", () => {
  it("shows each online rider, where they last were, and their delivery", async () => {
    await profile.update({ status: "APPROVED", isOnline: true });
    await saveLatestLocation(profile.id, { latitude: 6.69, longitude: -1.62 }, Date.now(), 0);

    const response = await as(admin).get(`${adminUrl}/live`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([
      {
        id: profile.id,
        fullName: "Yaw Mensah",
        phone: rider.phone,
        vehicleType: "MOTORBIKE",
        location: { latitude: 6.69, longitude: -1.62, at: expect.any(String) },
        delivery: null,
      },
    ]);
  });

  it("is empty when nobody is online, and admins only", async () => {
    const empty = await as(admin).get(`${adminUrl}/live`);
    const asRider = await as(rider).get(`${adminUrl}/live`);

    expect(empty.body.data).toEqual([]);
    expect(asRider.status).toBe(403);
  });
});
