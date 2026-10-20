import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { MenuCategory, MenuItem, RestaurantDocument } from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { createTestUser } from "../helpers/users.js";
import { createOwner, createTestRestaurant } from "../helpers/restaurants.js";

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

const { deleteFromCloudinary } = await import("../../src/services/upload/cloudinary.service.js");

// A real 1x1 PNG, a real (tiny) PDF, and a program pretending to be a photo
const pngFile = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);
const pdfFile = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n");
const fakeJpeg = Buffer.from("MZ this is really a Windows program, not a photo");

let owner;
let restaurant;
let otherOwner;
let admin;

beforeEach(async () => {
  vi.clearAllMocks();

  owner = await createOwner({ status: "ACTIVE" });
  restaurant = await createTestRestaurant(owner, { status: "APPROVED" });
  otherOwner = await createOwner({ email: "other@example.com", phone: "+233551112222" });
  admin = await createTestUser({
    role: "ADMIN",
    email: "admin@example.com",
    phone: "+233201112222",
  });
});

const putFile = (user, path, field, buffer, filename) => {
  return request(app)
    .put(path)
    .set("Cookie", `access_token=${signAccessToken(user)}`)
    .attach(field, buffer, filename);
};

const getAs = (user, path) => {
  return request(app)
    .get(path)
    .set("Cookie", `access_token=${signAccessToken(user)}`);
};

const ownerUrl = (ending) => `/api/v1/owner/restaurants/${restaurant.id}${ending}`;

describe("Restaurant logo and cover [AC-IMG-01, AC-IMG-02, AC-IMG-04]", () => {
  it("uploads a logo and saves its link", async () => {
    const response = await putFile(owner, ownerUrl("/logo"), "image", pngFile, "logo.png");

    expect(response.status).toBe(200);
    expect(response.body.data.logoUrl).toContain("restaurants/logos");
  });

  it("deletes the old logo from Cloudinary when it is replaced", async () => {
    await putFile(owner, ownerUrl("/logo"), "image", pngFile, "first.png");
    const firstPublicId = (await restaurant.reload()).logoPublicId;

    await putFile(owner, ownerUrl("/logo"), "image", pngFile, "second.png");

    expect(deleteFromCloudinary).toHaveBeenLastCalledWith(firstPublicId);
  });

  it("uploads a cover image", async () => {
    const response = await putFile(owner, ownerUrl("/cover"), "image", pngFile, "cover.png");

    expect(response.body.data.coverImageUrl).toContain("restaurants/covers");
  });

  it("checks the real file type, not the name", async () => {
    const response = await putFile(owner, ownerUrl("/logo"), "image", fakeJpeg, "photo.jpg");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("UNSUPPORTED_FILE_TYPE");
  });

  it("refuses a PDF as a logo", async () => {
    const response = await putFile(owner, ownerUrl("/logo"), "image", pdfFile, "logo.pdf");

    expect(response.body.error.code).toBe("UNSUPPORTED_FILE_TYPE");
  });

  it("refuses files over 5 MB", async () => {
    const hugeFile = Buffer.alloc(5 * 1024 * 1024 + 1);

    const response = await putFile(owner, ownerUrl("/logo"), "image", hugeFile, "huge.png");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("FILE_TOO_LARGE");
  });

  it("needs a file", async () => {
    const response = await request(app)
      .put(ownerUrl("/logo"))
      .set("Cookie", `access_token=${signAccessToken(owner)}`);

    expect(response.body.error.code).toBe("FILE_REQUIRED");
  });

  it("returns 404 for another owner's restaurant [AC-RBAC-04]", async () => {
    const response = await putFile(otherOwner, ownerUrl("/logo"), "image", pngFile, "logo.png");

    expect(response.status).toBe(404);
  });
});

describe("Menu item photo [AC-IMG-01, AC-IMG-04]", () => {
  it("uploads a dish photo and replaces the old one", async () => {
    const category = await MenuCategory.create({ restaurantId: restaurant.id, name: "Rice" });
    const item = await MenuItem.create({
      restaurantId: restaurant.id,
      categoryId: category.id,
      name: "Waakye",
      pricePesewas: 3000,
      imagePublicId: "menu-items/old-photo",
    });
    const url = ownerUrl(`/menu/items/${item.id}/image`);

    const response = await putFile(owner, url, "image", pngFile, "waakye.png");

    expect(response.status).toBe(200);
    expect(response.body.data.imageUrl).toContain("menu-items");
    expect(deleteFromCloudinary).toHaveBeenCalledWith("menu-items/old-photo");
  });
});

describe("Verification documents [AC-IMG-03]", () => {
  const documentUrl = (type) => ownerUrl(`/documents/${type}`);

  it("accepts a PDF and never gives the owner a link", async () => {
    const response = await putFile(
      owner,
      documentUrl("FDA_CERTIFICATE"),
      "file",
      pdfFile,
      "fda.pdf",
    );

    expect(response.status).toBe(200);
    expect(response.body.data.documentType).toBe("FDA_CERTIFICATE");
    expect(response.body.data.url).toBeUndefined();
    expect(response.body.data.publicId).toBeUndefined();
  });

  it("replaces a document of the same type and deletes the old private file", async () => {
    await putFile(owner, documentUrl("GHANA_CARD"), "file", pngFile, "card.png");
    const first = await RestaurantDocument.findOne();

    await putFile(owner, documentUrl("GHANA_CARD"), "file", pdfFile, "card.pdf");

    expect(await RestaurantDocument.count()).toBe(1);
    expect(deleteFromCloudinary).toHaveBeenCalledWith(first.publicId, "authenticated");
  });

  it("sends a replaced document back to PENDING for a new check [AC-REST-01]", async () => {
    await putFile(owner, documentUrl("TAX_CERTIFICATE"), "file", pdfFile, "tin.pdf");
    await RestaurantDocument.update(
      { verificationStatus: "REJECTED", rejectionReason: "The page is cut off" },
      { where: { restaurantId: restaurant.id } },
    );

    const response = await putFile(
      owner,
      documentUrl("TAX_CERTIFICATE"),
      "file",
      pdfFile,
      "tin.pdf",
    );

    expect(response.body.data.verificationStatus).toBe("PENDING");
    expect(response.body.data.rejectionReason).toBeNull();
  });

  it("rejects an unknown document type", async () => {
    const response = await putFile(owner, documentUrl("PASSPORT"), "file", pdfFile, "p.pdf");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("lets admins see each document with a short-lived link", async () => {
    await putFile(owner, documentUrl("FDA_CERTIFICATE"), "file", pdfFile, "fda.pdf");

    const response = await getAs(admin, `/api/v1/admin/restaurants/${restaurant.id}/documents`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].url).toContain("expires");
  });

  it("blocks owners from the admin document list", async () => {
    const response = await getAs(owner, `/api/v1/admin/restaurants/${restaurant.id}/documents`);

    expect(response.status).toBe(403);
  });
});
