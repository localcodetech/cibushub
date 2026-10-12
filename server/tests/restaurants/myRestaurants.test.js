import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { createOwner, createTestRestaurant } from "../helpers/restaurants.js";
import { createPaidOrder } from "../helpers/orders.js";

let ownerA;
let ownerB;

beforeEach(async () => {
  ownerA = await createOwner();
  ownerB = await createOwner({ email: "owner.b@example.com", phone: "+233551112222" });
});

const getAs = (user, path) => {
  return request(app)
    .get(path)
    .set("Cookie", `access_token=${signAccessToken(user)}`);
};

describe("GET /api/v1/owner/restaurants", () => {
  it("lists only my own restaurants, newest first [AC-REST-08]", async () => {
    await createTestRestaurant(ownerA, {
      name: "Adum Chop Bar",
      createdAt: new Date("2026-10-01"),
    });
    await createTestRestaurant(ownerA, {
      name: "Bantama Grills",
      createdAt: new Date("2026-10-02"),
    });
    await createTestRestaurant(ownerB, { name: "Owner B's Kitchen" });

    const response = await getAs(ownerA, "/api/v1/owner/restaurants");

    expect(response.status).toBe(200);
    expect(response.body.data.map((restaurant) => restaurant.name)).toEqual([
      "Bantama Grills",
      "Adum Chop Bar",
    ]);
  });

  it("says when each restaurant last had a paid order (null if never)", async () => {
    // A Friday noon: the helper's restaurant is open
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-09T12:00:00Z"));
    const { owner, restaurant, order } = await createPaidOrder(1);
    const quiet = await createTestRestaurant(owner, { name: "Quiet Kitchen" });
    vi.useRealTimers();

    const response = await getAs(owner, "/api/v1/owner/restaurants");
    const byId = Object.fromEntries(response.body.data.map((item) => [item.id, item]));

    expect(byId[restaurant.id].lastOrderAt).toBe(order.createdAt.toISOString());
    expect(byId[quiet.id].lastOrderAt).toBeNull();
  });

  it("shows rejected restaurants with their reason [AC-REST-02]", async () => {
    await createTestRestaurant(ownerA, {
      status: "REJECTED",
      rejectionReason: "FDA certificate is blurry",
    });

    const response = await getAs(ownerA, "/api/v1/owner/restaurants");

    expect(response.body.data[0].status).toBe("REJECTED");
    expect(response.body.data[0].rejectionReason).toBe("FDA certificate is blurry");
  });
});

describe("GET /api/v1/owner/restaurants/:restaurantId", () => {
  it("shows my restaurant with its opening hours", async () => {
    const restaurant = await createTestRestaurant(ownerA);

    const response = await getAs(ownerA, `/api/v1/owner/restaurants/${restaurant.id}`);

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(restaurant.id);
    expect(response.body.data.openingHours).toHaveLength(7);
  });

  it("returns 404 when owner A asks for owner B's restaurant [AC-RBAC-04]", async () => {
    const restaurantOfB = await createTestRestaurant(ownerB);

    const response = await getAs(ownerA, `/api/v1/owner/restaurants/${restaurantOfB.id}`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("returns 404 for an ID that does not exist", async () => {
    const response = await getAs(ownerA, "/api/v1/owner/restaurants/not-a-real-id");

    expect(response.status).toBe(404);
  });
});
