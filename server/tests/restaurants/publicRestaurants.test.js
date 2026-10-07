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

const browse = (query = "") => request(app).get(`/api/v1/restaurants${query}`);

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

describe("GET /api/v1/restaurants [AC-DISC-01, AC-DISC-02]", () => {
  it("shows only approved restaurants, to guests with no login", async () => {
    await createTestRestaurant(owner, { name: "Live Kitchen", status: "APPROVED" });
    await createTestRestaurant(owner, { name: "Pending Kitchen" });
    await createTestRestaurant(owner, { name: "Rejected Kitchen", status: "REJECTED" });
    await createTestRestaurant(owner, { name: "Suspended Kitchen", status: "SUSPENDED" });

    const response = await browse();

    expect(response.status).toBe(200);
    expect(response.body.data.map((restaurant) => restaurant.name)).toEqual(["Live Kitchen"]);
  });

  it("never shows the legal name or owner to the public", async () => {
    await createTestRestaurant(owner, { status: "APPROVED" });

    const response = await browse();

    expect(response.body.data[0].legalName).toBeUndefined();
    expect(response.body.data[0].ownerId).toBeUndefined();
    expect(response.body.data[0].openStatus).toHaveProperty("label");
  });

  it("splits results into pages [AC-GLOBAL-04]", async () => {
    for (let number = 1; number <= 3; number++) {
      await createTestRestaurant(owner, { name: `Kitchen ${number}`, status: "APPROVED" });
    }

    const response = await browse("?pageSize=2&page=2");

    expect(response.body.data).toHaveLength(1);
    expect(response.body.meta).toEqual({ page: 2, pageSize: 2, totalItems: 3, totalPages: 2 });
  });
});

describe("Search [AC-DISC-05]", () => {
  it("finds a restaurant by a dish on its menu, and shows the dish", async () => {
    const waakyePlace = await createTestRestaurant(owner, {
      name: "Mama's Place",
      status: "APPROVED",
    });
    const otherPlace = await createTestRestaurant(owner, {
      name: "Burger Spot",
      description: "Burgers and fries",
      status: "APPROVED",
    });
    await addDish(waakyePlace, "Waakye Special");
    await addDish(otherPlace, "Cheeseburger");

    const response = await browse("?q=waakye");

    expect(response.body.data.map((restaurant) => restaurant.name)).toEqual(["Mama's Place"]);
    expect(response.body.data[0].matchingDishes[0].name).toBe("Waakye Special");
  });

  it("finds a restaurant by its name, even half-typed", async () => {
    await createTestRestaurant(owner, { name: "Auntie Esi's Kitchen", status: "APPROVED" });
    await createTestRestaurant(owner, { name: "Burger Spot", status: "APPROVED" });

    const response = await browse("?q=aunt");

    expect(response.body.data.map((restaurant) => restaurant.name)).toEqual([
      "Auntie Esi's Kitchen",
    ]);
  });

  it("ignores dishes that were deleted", async () => {
    const restaurant = await createTestRestaurant(owner, { status: "APPROVED" });
    const dish = await addDish(restaurant, "Banku and Tilapia");
    await dish.destroy();

    const response = await browse("?q=banku");

    expect(response.body.data).toHaveLength(0);
  });

  it("never finds hidden restaurants, even by dish", async () => {
    const hidden = await createTestRestaurant(owner, { status: "SUSPENDED" });
    await addDish(hidden, "Fufu and Light Soup");

    const response = await browse("?q=fufu");

    expect(response.body.data).toHaveLength(0);
  });
});

describe("Filters and sorting [AC-DISC-07, AC-DISC-08]", () => {
  it("filters by cuisine", async () => {
    await createTestRestaurant(owner, {
      name: "Pizza Palace",
      status: "APPROVED",
      cuisineTags: ["pizza"],
    });
    await createTestRestaurant(owner, {
      name: "Chop Bar",
      status: "APPROVED",
      cuisineTags: ["ghanaian"],
    });

    const response = await browse("?cuisine=Pizza");

    expect(response.body.data.map((restaurant) => restaurant.name)).toEqual(["Pizza Palace"]);
  });

  it("shows only open restaurants with openNow=true [AC-DISC-04]", async () => {
    // Friday 12:00 in Ghana: the test hours are Monday to Saturday 08:00-22:00
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-09T12:00:00Z"));
    await createTestRestaurant(owner, { name: "Open Kitchen", status: "APPROVED" });
    await createTestRestaurant(owner, {
      name: "Switched Off",
      status: "APPROVED",
      isAcceptingOrders: false,
    });

    const response = await browse("?openNow=true");

    expect(response.body.data.map((restaurant) => restaurant.name)).toEqual(["Open Kitchen"]);
    expect(response.body.data[0].openStatus.label).toBe("Open");
  });

  it("sorts by distance when the customer shares a location [AC-DISC-03]", async () => {
    await createTestRestaurant(owner, { name: "Near KNUST", status: "APPROVED", ...KNUST });
    await createTestRestaurant(owner, { name: "In Adum", status: "APPROVED", ...ADUM });

    const response = await browse(`?latitude=${ADUM.latitude}&longitude=${ADUM.longitude}`);

    const [nearest, farther] = response.body.data;
    expect(nearest.name).toBe("In Adum");
    expect(nearest.distanceKm).toBe(0);
    expect(farther.distanceKm).toBe(6);
    expect(farther.deliversToYou).toBe(false);
  });

  it("sorts by delivery time", async () => {
    await createTestRestaurant(owner, { name: "Slow", status: "APPROVED", prepTimeMinutes: 45 });
    await createTestRestaurant(owner, { name: "Fast", status: "APPROVED", prepTimeMinutes: 10 });

    const response = await browse("?sort=deliveryTime");

    expect(response.body.data.map((restaurant) => restaurant.name)).toEqual(["Fast", "Slow"]);
  });
});

describe("GET /api/v1/restaurants/:restaurantId [AC-DISC-10]", () => {
  it("shows the restaurant with its menu, including sold-out items", async () => {
    const restaurant = await createTestRestaurant(owner, { status: "APPROVED" });
    await addDish(restaurant, "Jollof Rice");
    await addDish(restaurant, "Red Red", { isAvailable: false });

    const response = await request(app).get(`/api/v1/restaurants/${restaurant.id}`);

    expect(response.status).toBe(200);
    expect(response.body.data.openingHours).toHaveLength(7);
    const dishes = response.body.data.menu.flatMap((category) => category.items);
    expect(dishes.map((dish) => dish.name).sort()).toEqual(["Jollof Rice", "Red Red"]);
    expect(dishes.find((dish) => dish.name === "Red Red").isAvailable).toBe(false);
    expect(response.body.data.legalName).toBeUndefined();
  });

  it("returns 404 for pending, rejected and suspended restaurants [AC-DISC-02]", async () => {
    for (const status of ["PENDING_APPROVAL", "REJECTED", "SUSPENDED"]) {
      const hidden = await createTestRestaurant(owner, { status });

      const response = await request(app).get(`/api/v1/restaurants/${hidden.id}`);

      expect(response.status).toBe(404);
    }
  });
});
