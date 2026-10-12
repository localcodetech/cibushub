import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { createTestUser } from "../helpers/users.js";
import { createOwner, createTestRestaurant } from "../helpers/restaurants.js";
import { createPaidOrder } from "../helpers/orders.js";

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

// Some tests set the clock; always put it back
afterEach(() => {
  vi.useRealTimers();
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

  it("shows the owner's contact and the last 30 days: orders by status, delivered total, rating", async () => {
    // A Friday at noon: the test restaurant is open
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-09T12:00:00Z"));
    const { order, restaurant, owner: orderOwner } = await createPaidOrder();
    await order.update({ status: "DELIVERED" });
    await restaurant.update({ ratingTotal: 9, reviewCount: 2 });

    const response = await getAs(admin, `/api/v1/admin/restaurants/${restaurant.id}`);

    expect(response.body.data.owner).toEqual({
      id: orderOwner.id,
      fullName: orderOwner.fullName,
      email: orderOwner.email,
      phone: orderOwner.phone,
    });
    expect(response.body.data.performance).toMatchObject({
      days: 30,
      totalOrders: 1,
      ordersByStatus: { DELIVERED: 1 },
      deliveredPesewas: order.totalPesewas,
      averageRating: 4.5,
      reviewCount: 2,
    });
    expect(response.body.data.performance.recentOrders[0]).toMatchObject({
      orderNumber: order.orderNumber,
      status: "DELIVERED",
    });
  });
});

describe("Searching restaurants by name [AC-ADM-03]", () => {
  it("finds part of a name, and treats % and _ as plain letters", async () => {
    await createTestRestaurant(owner, { name: "Golden Pot Kitchen" });
    await createTestRestaurant(owner, { name: "Waakye Joint" });

    const found = await getAs(admin, "/api/v1/admin/restaurants?q=gold");
    const percent = await getAs(admin, "/api/v1/admin/restaurants?q=%25");

    expect(found.body.data.map((restaurant) => restaurant.name)).toEqual(["Golden Pot Kitchen"]);
    expect(percent.body.data).toEqual([]);
  });
});
