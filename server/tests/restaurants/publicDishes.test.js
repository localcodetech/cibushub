import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { MenuCategory, MenuItem } from "../../src/models/index.js";
import { createOwner, createTestRestaurant } from "../helpers/restaurants.js";

// Pins around Kumasi
const ADUM = { latitude: 6.6885, longitude: -1.6244 };
const KNUST = { latitude: 6.6745, longitude: -1.5716 };

let owner;

beforeEach(async () => {
  owner = await createOwner({ status: "ACTIVE" });
});

afterEach(() => {
  vi.useRealTimers();
});

const search = (query) => request(app).get(`/api/v1/dishes${query}`);

const addDish = async (restaurant, name, extra = {}) => {
  const category = await MenuCategory.create({ restaurantId: restaurant.id, name: "Mains" });
  return MenuItem.create({
    restaurantId: restaurant.id,
    categoryId: category.id,
    name,
    pricePesewas: 3500,
    ...extra,
  });
};

// Friday 12:00 in Ghana: the test hours are Monday to Saturday 08:00-22:00
const atFridayNoon = () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-09T12:00:00Z"));
};

describe("GET /api/v1/dishes: the same dish from every kitchen [AC-DISC-05]", () => {
  it("finds the dish in every approved restaurant, with the restaurant's public details", async () => {
    const mama = await createTestRestaurant(owner, { name: "Mama's Place", status: "APPROVED" });
    const golden = await createTestRestaurant(owner, { name: "Golden Pot", status: "APPROVED" });
    await addDish(mama, "Jollof with Chicken");
    await addDish(golden, "Jollof with Goat");
    await addDish(golden, "Banku and Tilapia");

    const response = await search("?q=jollof");

    expect(response.status).toBe(200);
    expect(response.body.data.map((dish) => dish.name).sort()).toEqual([
      "Jollof with Chicken",
      "Jollof with Goat",
    ]);
    const restaurant = response.body.data[0].restaurant;
    expect(restaurant).toHaveProperty("name");
    expect(restaurant).toHaveProperty("openStatus");
    expect(restaurant.legalName).toBeUndefined();
    expect(restaurant.ownerId).toBeUndefined();
  });

  it("never shows dishes from hidden restaurants, or deleted dishes", async () => {
    const live = await createTestRestaurant(owner, { status: "APPROVED" });
    const suspended = await createTestRestaurant(owner, { status: "SUSPENDED" });
    const pending = await createTestRestaurant(owner);
    await addDish(suspended, "Waakye Special");
    await addDish(pending, "Waakye with Egg");
    const deleted = await addDish(live, "Waakye Deluxe");
    await deleted.destroy();

    const response = await search("?q=waakye");

    expect(response.body.data).toHaveLength(0);
  });

  it("lists dishes you can order now first: sold-out and closed kitchens go last", async () => {
    atFridayNoon();
    const open = await createTestRestaurant(owner, { name: "Open", status: "APPROVED" });
    const closed = await createTestRestaurant(owner, {
      name: "Closed",
      status: "APPROVED",
      isAcceptingOrders: false,
    });
    await addDish(closed, "Kelewele Large", { pricePesewas: 1000 });
    await addDish(open, "Kelewele Sold Out", { pricePesewas: 1200, stockRemaining: 0 });
    await addDish(open, "Kelewele Small", { pricePesewas: 2000 });

    const response = await search("?q=kelewele");

    expect(response.body.data[0].name).toBe("Kelewele Small");
    expect(
      response.body.data
        .map((dish) => dish.name)
        .slice(1)
        .sort(),
    ).toEqual(["Kelewele Large", "Kelewele Sold Out"]);
  });

  it("puts dishes named after the food before ones that only mention it", async () => {
    const restaurant = await createTestRestaurant(owner, { status: "APPROVED" });
    await addDish(restaurant, "Grilled Chicken", {
      description: "Served with jollof",
      pricePesewas: 1000,
    });
    await addDish(restaurant, "Party Jollof", { pricePesewas: 5000 });

    const response = await search("?q=jollof");

    expect(response.body.data.map((dish) => dish.name)).toEqual([
      "Party Jollof",
      "Grilled Chicken",
    ]);
  });

  it("shows only open kitchens with openNow=true [AC-DISC-04]", async () => {
    atFridayNoon();
    const open = await createTestRestaurant(owner, { status: "APPROVED" });
    const closed = await createTestRestaurant(owner, {
      status: "APPROVED",
      isAcceptingOrders: false,
    });
    await addDish(open, "Fried Yam");
    await addDish(closed, "Fried Yam with Pepper");

    const response = await search("?q=yam&openNow=true");

    expect(response.body.data.map((dish) => dish.name)).toEqual(["Fried Yam"]);
  });

  it("puts the nearest kitchen first when the customer shares a location [AC-DISC-03]", async () => {
    const far = await createTestRestaurant(owner, { status: "APPROVED", ...KNUST });
    const near = await createTestRestaurant(owner, { status: "APPROVED", ...ADUM });
    await addDish(far, "Shawarma Far", { pricePesewas: 1000 });
    await addDish(near, "Shawarma Near", { pricePesewas: 4000 });

    const response = await search(
      `?q=shawarma&latitude=${ADUM.latitude}&longitude=${ADUM.longitude}`,
    );

    expect(response.body.data.map((dish) => dish.name)).toEqual(["Shawarma Near", "Shawarma Far"]);
    expect(response.body.data[0].restaurant.distanceKm).toBe(0);
  });

  it("splits results into pages [AC-GLOBAL-04]", async () => {
    const restaurant = await createTestRestaurant(owner, { status: "APPROVED" });
    for (let number = 1; number <= 3; number++) {
      await addDish(restaurant, `Kenkey ${number}`);
    }

    const response = await search("?q=kenkey&pageSize=2&page=2");

    expect(response.body.data).toHaveLength(1);
    expect(response.body.meta).toEqual({ page: 2, pageSize: 2, totalItems: 3, totalPages: 2 });
  });

  it("asks for the words to search for", async () => {
    const response = await search("");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});
