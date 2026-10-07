import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { createTestUser } from "../helpers/users.js";
import { createOwner, createTestRestaurant } from "../helpers/restaurants.js";

let admin;
let owner;

beforeEach(async () => {
  admin = await createTestUser({
    role: "ADMIN",
    email: "admin@example.com",
    phone: "+233201112222",
  });
  owner = await createOwner();
});

const getAs = (user, path) => {
  return request(app)
    .get(path)
    .set("Cookie", `access_token=${signAccessToken(user)}`);
};

describe("GET /api/v1/admin/restaurants [AC-ADM-03, AC-GLOBAL-04]", () => {
  it("lists the review queue filtered by status, oldest first", async () => {
    await createTestRestaurant(owner, { name: "Second", createdAt: new Date("2026-10-02") });
    await createTestRestaurant(owner, { name: "First", createdAt: new Date("2026-10-01") });
    await createTestRestaurant(owner, { name: "Live One", status: "APPROVED" });

    const response = await getAs(admin, "/api/v1/admin/restaurants?status=PENDING_APPROVAL");

    expect(response.status).toBe(200);
    expect(response.body.data.map((restaurant) => restaurant.name)).toEqual(["First", "Second"]);
  });

  it("lists every status when no filter is given", async () => {
    await createTestRestaurant(owner);
    await createTestRestaurant(owner, { status: "APPROVED" });
    await createTestRestaurant(owner, { status: "REJECTED", rejectionReason: "Missing documents" });

    const response = await getAs(admin, "/api/v1/admin/restaurants");

    expect(response.body.data).toHaveLength(3);
  });

  it("splits results into pages and returns page meta", async () => {
    for (let number = 1; number <= 5; number++) {
      await createTestRestaurant(owner, { name: `Restaurant ${number}` });
    }

    const response = await getAs(admin, "/api/v1/admin/restaurants?page=2&pageSize=2");

    expect(response.body.data).toHaveLength(2);
    expect(response.body.meta).toEqual({ page: 2, pageSize: 2, totalItems: 5, totalPages: 3 });
  });

  it("uses 20 per page by default", async () => {
    const response = await getAs(admin, "/api/v1/admin/restaurants");

    expect(response.body.meta.pageSize).toBe(20);
    expect(response.body.meta.page).toBe(1);
  });

  it("rejects a page size above 100 and an unknown status", async () => {
    const tooBig = await getAs(admin, "/api/v1/admin/restaurants?pageSize=500");
    const unknownStatus = await getAs(admin, "/api/v1/admin/restaurants?status=OPEN");

    expect(tooBig.status).toBe(400);
    expect(unknownStatus.status).toBe(400);
  });

  it("shows the owner's contact details but never their password", async () => {
    await createTestRestaurant(owner);

    const response = await getAs(admin, "/api/v1/admin/restaurants");

    const listedOwner = response.body.data[0].owner;
    expect(listedOwner.phone).toBe(owner.phone);
    expect(listedOwner.passwordHash).toBeUndefined();
  });

  it("blocks restaurant owners [AC-RBAC-02]", async () => {
    const response = await getAs(owner, "/api/v1/admin/restaurants");

    expect(response.status).toBe(403);
  });
});

describe("GET /api/v1/admin/restaurants/:restaurantId", () => {
  it("lets an admin open any restaurant, whatever its status, with its hours", async () => {
    const restaurant = await createTestRestaurant(owner);

    const response = await getAs(admin, `/api/v1/admin/restaurants/${restaurant.id}`);

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("PENDING_APPROVAL");
    expect(response.body.data.openingHours).toHaveLength(7);
  });
});
