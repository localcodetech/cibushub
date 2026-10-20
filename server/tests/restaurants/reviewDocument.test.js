import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { AuditLog, RestaurantDocument } from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { createTestUser } from "../helpers/users.js";
import { addRequiredDocuments, createOwner, createTestRestaurant } from "../helpers/restaurants.js";

let admin;
let owner;
let restaurant;

beforeEach(async () => {
  admin = await createTestUser({
    role: "ADMIN",
    email: "admin@example.com",
    phone: "+233201112222",
  });
  owner = await createOwner();
  restaurant = await createTestRestaurant(owner);
  await addRequiredDocuments(restaurant, "PENDING");
});

const patchAs = (user, documentType, body) => {
  return request(app)
    .patch(`/api/v1/admin/restaurants/${restaurant.id}/documents/${documentType}`)
    .set("Cookie", `access_token=${signAccessToken(user)}`)
    .send(body);
};

const findDocument = (documentType) => {
  return RestaurantDocument.findOne({ where: { restaurantId: restaurant.id, documentType } });
};

describe("PATCH /api/v1/admin/restaurants/:restaurantId/documents/:documentType", () => {
  it("marks a document verified and records who checked it [AC-REST-01, AC-ADM-07]", async () => {
    const response = await patchAs(admin, "TAX_CERTIFICATE", { status: "VERIFIED" });

    const document = await findDocument("TAX_CERTIFICATE");
    const auditLine = await AuditLog.findOne({ where: { targetId: restaurant.id } });
    expect(response.status).toBe(200);
    expect(response.body.data.verificationStatus).toBe("VERIFIED");
    expect(document.reviewedBy).toBe(admin.id);
    expect(document.reviewedAt).not.toBeNull();
    expect(auditLine.action).toBe("RESTAURANT_DOCUMENT_VERIFIED");
  });

  it("rejects a document with a reason the owner can read", async () => {
    await patchAs(admin, "TAX_CERTIFICATE", {
      status: "REJECTED",
      reason: "The page is cut off at the bottom",
    });

    const response = await request(app)
      .get(`/api/v1/owner/restaurants/${restaurant.id}/documents`)
      .set("Cookie", `access_token=${signAccessToken(owner)}`);

    const taxCertificate = response.body.data.find(
      (document) => document.documentType === "TAX_CERTIFICATE",
    );
    expect(taxCertificate.verificationStatus).toBe("REJECTED");
    expect(taxCertificate.rejectionReason).toBe("The page is cut off at the bottom");
  });

  it("requires a reason to reject", async () => {
    const response = await patchAs(admin, "TAX_CERTIFICATE", { status: "REJECTED" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("clears an old rejection reason when the document is verified", async () => {
    await patchAs(admin, "TAX_CERTIFICATE", {
      status: "REJECTED",
      reason: "The page is cut off at the bottom",
    });

    await patchAs(admin, "TAX_CERTIFICATE", { status: "VERIFIED" });

    const document = await findDocument("TAX_CERTIFICATE");
    expect(document.rejectionReason).toBeNull();
  });

  it("returns 404 for a document that was never uploaded", async () => {
    const response = await patchAs(admin, "GHANA_CARD", { status: "VERIFIED" });

    expect(response.status).toBe(404);
  });

  it("lets the admin approve once both required documents are verified", async () => {
    await patchAs(admin, "BUSINESS_REGISTRATION", { status: "VERIFIED" });
    await patchAs(admin, "TAX_CERTIFICATE", { status: "VERIFIED" });

    const response = await request(app)
      .post(`/api/v1/admin/restaurants/${restaurant.id}/approve`)
      .set("Cookie", `access_token=${signAccessToken(admin)}`);

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("APPROVED");
  });

  it("blocks owners from checking their own documents", async () => {
    const response = await patchAs(owner, "TAX_CERTIFICATE", { status: "VERIFIED" });

    expect(response.status).toBe(403);
  });
});
