import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { User } from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { createTestUser } from "../helpers/users.js";

// Pretend Cloudinary: tests never upload real files
vi.mock("../../src/services/upload/cloudinary.service.js", () => {
  let uploadNumber = 0;

  return {
    uploadPublicImage: vi.fn(async (buffer, folder) => {
      uploadNumber += 1;
      return {
        url: `https://res.cloudinary.com/demo/${folder}/photo-${uploadNumber}.webp`,
        publicId: `${folder}/photo-${uploadNumber}`,
      };
    }),
    deleteFromCloudinary: vi.fn(async () => {}),
    // Not used here, but other parts of the app import them
    uploadPrivateDocument: vi.fn(),
    signedDocumentUrl: vi.fn(),
  };
});

const { deleteFromCloudinary } = await import("../../src/services/upload/cloudinary.service.js");

// A real 1x1 PNG, and a program pretending to be a photo
const pngFile = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);
const fakeJpeg = Buffer.from("MZ this is really a Windows program, not a photo");

let customer;

beforeEach(async () => {
  vi.clearAllMocks();
  customer = await createTestUser({ fullName: "Ama Mensah" });
});

const patchProfile = (user, body) => {
  return request(app)
    .patch("/api/v1/profile")
    .set("Cookie", `access_token=${signAccessToken(user)}`)
    .send(body);
};

const putAvatar = (user, buffer, filename) => {
  return request(app)
    .put("/api/v1/profile/avatar")
    .set("Cookie", `access_token=${signAccessToken(user)}`)
    .attach("image", buffer, filename);
};

describe("PATCH /api/v1/profile [AC-CUST-01]", () => {
  it("changes my name and returns it straight away", async () => {
    const response = await patchProfile(customer, { fullName: "  Ama Serwaa Mensah " });

    expect(response.status).toBe(200);
    expect(response.body.data.fullName).toBe("Ama Serwaa Mensah");
    expect(response.body.data.passwordHash).toBeUndefined();
  });

  it("refuses a name that is too short", async () => {
    const response = await patchProfile(customer, { fullName: "A" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("refuses to change role or phone here [AC-SEC-07, AC-CUST-02]", async () => {
    const response = await patchProfile(customer, {
      fullName: "Ama Mensah",
      role: "ADMIN",
      phone: "+233209998888",
    });

    expect(response.status).toBe(400);
    const saved = await User.findByPk(customer.id);
    expect(saved.role).toBe("CUSTOMER");
    expect(saved.phone).toBe(customer.phone);
  });

  it("works for every role, e.g. a rider", async () => {
    const rider = await createTestUser({
      role: "RIDER",
      email: "rider@example.com",
      phone: "+233551112222",
    });

    const response = await patchProfile(rider, { fullName: "Kojo Rider" });

    expect(response.status).toBe(200);
  });

  it("needs a login", async () => {
    const response = await request(app).patch("/api/v1/profile").send({ fullName: "Ama" });

    expect(response.status).toBe(401);
  });

  it("needs a verified phone", async () => {
    const unverified = await createTestUser({
      status: "PENDING_VERIFICATION",
      email: "new@example.com",
      phone: "+233209998888",
    });

    const response = await patchProfile(unverified, { fullName: "New Person" });

    expect(response.status).toBe(403);
  });
});

describe("PUT /api/v1/profile/avatar [AC-CUST-01, AC-IMG-01, AC-IMG-04]", () => {
  it("uploads my photo and saves its link", async () => {
    const response = await putAvatar(customer, pngFile, "me.png");

    expect(response.status).toBe(200);
    expect(response.body.data.avatarUrl).toContain("avatars");
  });

  it("deletes the old photo when I upload a new one", async () => {
    await putAvatar(customer, pngFile, "first.png");
    const firstPublicId = (await User.findByPk(customer.id)).avatarPublicId;

    await putAvatar(customer, pngFile, "second.png");

    expect(deleteFromCloudinary).toHaveBeenLastCalledWith(firstPublicId);
  });

  it("checks the real file type, not the name", async () => {
    const response = await putAvatar(customer, fakeJpeg, "me.jpg");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("UNSUPPORTED_FILE_TYPE");
  });
});
