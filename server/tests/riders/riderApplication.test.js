import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { RiderProfile } from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { createTestUser } from "../helpers/users.js";

// Pretend Cloudinary: tests never upload real files
vi.mock("../../src/services/upload/cloudinary.service.js", () => {
  let uploadNumber = 0;

  return {
    uploadPublicImage: vi.fn(async (buffer, folder) => {
      uploadNumber += 1;
      return {
        url: `https://res.cloudinary.com/demo/${folder}/image-${uploadNumber}.webp`,
        publicId: `${folder}/image-${uploadNumber}`,
      };
    }),
    uploadPrivateDocument: vi.fn(async (buffer, folder) => {
      uploadNumber += 1;
      return { publicId: `${folder}/doc-${uploadNumber}`, format: "pdf" };
    }),
    signedDocumentUrl: vi.fn((publicId) => `https://signed.example/${publicId}?expires=300`),
    deleteFromCloudinary: vi.fn(async () => {}),
  };
});

// Catch the live alert to admins instead of sending it
vi.mock("../../src/sockets/emitAdminAlert.js", () => ({ emitAdminAlert: vi.fn() }));

const { deleteFromCloudinary } = await import("../../src/services/upload/cloudinary.service.js");
const { emitAdminAlert } = await import("../../src/sockets/emitAdminAlert.js");

const pngFile = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);
const pdfFile = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n");

const url = "/api/v1/rider/application";
const motorbike = {
  vehicleType: "MOTORBIKE",
  plateNumber: "m-21-gr 1234",
  ghanaCardNumber: "gha-123456789-0",
};

let rider;

beforeEach(async () => {
  vi.clearAllMocks();
  // Riders wait for approval after registering, with a verified phone
  rider = await createTestUser({
    role: "RIDER",
    status: "PENDING_APPROVAL",
    email: "yaw.rider@example.com",
    phoneVerifiedAt: new Date(),
  });
});

const as = (user) => ({
  get: () =>
    request(app)
      .get(url)
      .set("Cookie", `access_token=${signAccessToken(user)}`),
  put: (body) =>
    request(app)
      .put(url)
      .set("Cookie", `access_token=${signAccessToken(user)}`)
      .send(body),
  file: (path, field, buffer, filename) =>
    request(app)
      .put(url + path)
      .set("Cookie", `access_token=${signAccessToken(user)}`)
      .attach(field, buffer, filename),
  submit: () =>
    request(app)
      .post(url + "/submit")
      .set("Cookie", `access_token=${signAccessToken(user)}`),
});

// Details, photo and both documents: a complete motorbike application
const completeApplication = async () => {
  await as(rider).put(motorbike);
  await as(rider).file("/photo", "image", pngFile, "me.png");
  await as(rider).file("/documents/GHANA_CARD", "document", pdfFile, "card.pdf");
  await as(rider).file("/documents/DRIVERS_LICENCE", "document", pdfFile, "licence.pdf");
};

describe("Rider application [AC-RIDER-01]", () => {
  it("starts empty and lists everything still missing", async () => {
    const response = await as(rider).get();

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      status: "NOT_STARTED",
      canEdit: true,
      missing: ["DETAILS", "PHOTO", "GHANA_CARD", "DRIVERS_LICENCE"],
    });
  });

  it("saves vehicle details in capitals, as a draft", async () => {
    const response = await as(rider).put(motorbike);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      status: "DRAFT",
      vehicleType: "MOTORBIKE",
      plateNumber: "M-21-GR 1234",
      ghanaCardNumber: "GHA-123456789-0",
    });
  });

  it("requires a plate for motorbikes and cars, but not for bicycles", async () => {
    const noPlate = await as(rider).put({ ...motorbike, plateNumber: undefined });
    const bicycle = await as(rider).put({
      vehicleType: "BICYCLE",
      plateNumber: "GR 1234-21",
      ghanaCardNumber: "GHA-123456789-0",
    });

    expect(noPlate.status).toBe(400);
    expect(bicycle.status).toBe(200);
    // A bicycle has no plate, and needs no driver's licence
    expect(bicycle.body.data.plateNumber).toBeNull();
    expect(bicycle.body.data.missing).not.toContain("DRIVERS_LICENCE");
  });

  it("refuses a Ghana Card number in the wrong format", async () => {
    const response = await as(rider).put({ ...motorbike, ghanaCardNumber: "123456789" });

    expect(response.status).toBe(400);
  });

  it("needs the details before any document", async () => {
    const response = await as(rider).file("/documents/GHANA_CARD", "document", pdfFile, "c.pdf");

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("DETAILS_REQUIRED");
  });

  it("keeps documents private: the rider never gets a link or Cloudinary ID", async () => {
    await as(rider).put(motorbike);
    const response = await as(rider).file("/documents/GHANA_CARD", "document", pdfFile, "c.pdf");

    expect(response.status).toBe(200);
    expect(response.body.data.documents).toEqual([
      expect.objectContaining({ documentType: "GHANA_CARD", format: "pdf" }),
    ]);
    expect(JSON.stringify(response.body.data)).not.toContain("riders/");
  });

  it("replaces a document, deleting the old file only after the new one is saved", async () => {
    await as(rider).put(motorbike);
    await as(rider).file("/documents/GHANA_CARD", "document", pdfFile, "old.pdf");
    await as(rider).file("/documents/GHANA_CARD", "document", pdfFile, "new.pdf");

    expect(deleteFromCloudinary).toHaveBeenCalledWith(
      expect.stringContaining("riders/"),
      "authenticated",
    );
  });

  it("refuses to submit while something is missing, and says what", async () => {
    await as(rider).put(motorbike);

    const response = await as(rider).submit();

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("APPLICATION_INCOMPLETE");
    expect(response.body.error.details.map((item) => item.field)).toEqual([
      "PHOTO",
      "GHANA_CARD",
      "DRIVERS_LICENCE",
    ]);
  });

  it("submits a complete application for review and alerts the admins", async () => {
    await completeApplication();

    const response = await as(rider).submit();

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      status: "PENDING_APPROVAL",
      missing: [],
      canEdit: false,
    });
    expect(response.body.data.photoUrl).toContain("avatars");
    expect(emitAdminAlert).toHaveBeenCalledWith(
      "RIDER_APPLIED",
      expect.objectContaining({ fullName: "Test User" }),
    );
  });

  it("locks the application while it is being reviewed", async () => {
    await completeApplication();
    await as(rider).submit();

    const response = await as(rider).put({ ...motorbike, vehicleType: "CAR" });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("APPLICATION_LOCKED");
  });

  it("lets a rejected rider fix the application and submit again", async () => {
    await completeApplication();
    await as(rider).submit();
    const profile = await RiderProfile.findOne({ where: { userId: rider.id } });
    await profile.update({ status: "REJECTED", rejectionReason: "Photo is blurry" });

    const edited = await as(rider).file("/photo", "image", pngFile, "clear.png");
    const resubmitted = await as(rider).submit();

    expect(edited.status).toBe(200);
    expect(resubmitted.body.data).toMatchObject({
      status: "PENDING_APPROVAL",
      rejectionReason: null,
    });
  });

  it("is for riders only, with a verified phone", async () => {
    const customer = await createTestUser({ email: "ama@example.com", phone: "+233551112222" });
    const unverified = await createTestUser({
      role: "RIDER",
      status: "PENDING_VERIFICATION",
      email: "new.rider@example.com",
      phone: "+233209998888",
    });

    expect((await as(customer).get()).status).toBe(403);
    expect((await as(unverified).get()).status).toBe(403);
  });
});
