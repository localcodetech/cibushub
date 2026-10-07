import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { MenuCategory, MenuItem, Option, OptionGroup } from "../../src/models/index.js";
import { createOwner, createTestRestaurant } from "../helpers/restaurants.js";

// Test restaurants open Monday to Saturday 08:00-22:00 (Accra = UTC), closed on Sunday
const FRIDAY_NOON = new Date("2026-10-09T12:00:00Z");
const SUNDAY_NOON = new Date("2026-10-11T12:00:00Z");

let restaurant;
let waakye;
let chicken;
let fish;

beforeEach(async () => {
  // Only the clock is frozen; everything else runs normally
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(FRIDAY_NOON);

  const owner = await createOwner({ status: "ACTIVE" });
  restaurant = await createTestRestaurant(owner, { status: "APPROVED", minOrderPesewas: 2000 });

  const category = await MenuCategory.create({ restaurantId: restaurant.id, name: "Rice" });
  waakye = await MenuItem.create({
    restaurantId: restaurant.id,
    categoryId: category.id,
    name: "Waakye",
    pricePesewas: 3000,
  });

  // "Protein: choose exactly 1"
  const protein = await OptionGroup.create({
    menuItemId: waakye.id,
    name: "Protein",
    minSelect: 1,
    maxSelect: 1,
  });
  chicken = await Option.create({
    optionGroupId: protein.id,
    name: "Chicken",
    extraPricePesewas: 0,
  });
  fish = await Option.create({ optionGroupId: protein.id, name: "Fish", extraPricePesewas: 500 });
});

afterEach(() => {
  vi.useRealTimers();
});

// Waakye with fish, as the customer saw it: GHS 35.00 each
const waakyeWithFish = (overrides = {}) => ({
  menuItemId: waakye.id,
  quantity: 2,
  optionIds: [fish.id],
  seenUnitPricePesewas: 3500,
  ...overrides,
});

const checkCart = (items, restaurantId = restaurant.id) => {
  return request(app).post("/api/v1/cart/check").send({ restaurantId, items });
};

const problemCodes = (problems) => problems.map((found) => found.code);

describe("POST /api/v1/cart/check [AC-CART-07]", () => {
  it("prices an unchanged cart from the menu and allows checkout", async () => {
    const response = await checkCart([waakyeWithFish()]);

    expect(response.status).toBe(200);
    expect(response.body.data.lines[0].unitPricePesewas).toBe(3500);
    expect(response.body.data.lines[0].lineTotalPesewas).toBe(7000);
    expect(response.body.data.lines[0].options[0].name).toBe("Fish");
    expect(response.body.data.subtotalPesewas).toBe(7000);
    expect(response.body.data.hasChanges).toBe(false);
    expect(response.body.data.canCheckout).toBe(true);
  });

  it("works for guests, with no login", async () => {
    const response = await checkCart([waakyeWithFish()]);

    expect(response.status).toBe(200);
  });

  it("spots a price change and blocks checkout until it is accepted", async () => {
    await waakye.update({ pricePesewas: 4000 });

    const response = await checkCart([waakyeWithFish()]);
    const line = response.body.data.lines[0];

    expect(line.unitPricePesewas).toBe(4500);
    expect(problemCodes(line.problems)).toContain("PRICE_CHANGED");
    expect(response.body.data.canCheckout).toBe(false);

    // The customer accepts the new price: the app sends it back as the price they saw
    const accepted = await checkCart([waakyeWithFish({ seenUnitPricePesewas: 4500 })]);
    expect(accepted.body.data.canCheckout).toBe(true);
  });

  it("never trusts the price the browser sends", async () => {
    const response = await checkCart([waakyeWithFish({ seenUnitPricePesewas: 1 })]);

    expect(response.body.data.lines[0].unitPricePesewas).toBe(3500);
    expect(response.body.data.subtotalPesewas).toBe(7000);
  });

  it("spots a sold-out item", async () => {
    await waakye.update({ isAvailable: false });

    const response = await checkCart([waakyeWithFish()]);

    expect(problemCodes(response.body.data.lines[0].problems)).toEqual(["ITEM_UNAVAILABLE"]);
    expect(response.body.data.subtotalPesewas).toBe(0);
    expect(response.body.data.canCheckout).toBe(false);
  });

  it("spots a deleted item", async () => {
    await waakye.destroy();

    const response = await checkCart([waakyeWithFish()]);

    expect(problemCodes(response.body.data.lines[0].problems)).toEqual(["ITEM_UNAVAILABLE"]);
  });

  it("spots when there is not enough stock left today", async () => {
    await waakye.update({ dailyStock: 10, stockRemaining: 1 });

    const response = await checkCart([waakyeWithFish()]);

    expect(problemCodes(response.body.data.lines[0].problems)).toContain("NOT_ENOUGH_STOCK");
  });

  it("spots an option that was switched off", async () => {
    await fish.update({ isAvailable: false });

    const response = await checkCart([waakyeWithFish()]);

    expect(problemCodes(response.body.data.lines[0].problems)).toContain("OPTION_UNAVAILABLE");
  });

  it("enforces 'choose exactly 1' for an option group", async () => {
    const response = await checkCart([waakyeWithFish({ optionIds: [chicken.id, fish.id] })]);

    expect(problemCodes(response.body.data.lines[0].problems)).toContain("OPTIONS_INVALID");
  });

  it("spots a restaurant that is closed right now", async () => {
    vi.setSystemTime(SUNDAY_NOON);

    const response = await checkCart([waakyeWithFish()]);

    expect(problemCodes(response.body.data.problems)).toContain("RESTAURANT_CLOSED");
    expect(response.body.data.canCheckout).toBe(false);
  });

  it("spots a restaurant that was suspended", async () => {
    await restaurant.update({ status: "SUSPENDED" });

    const response = await checkCart([waakyeWithFish()]);

    expect(problemCodes(response.body.data.problems)).toEqual(["RESTAURANT_UNAVAILABLE"]);
    expect(response.body.data.restaurant).toBeNull();
  });

  it("flags an order below the minimum [AC-CART-08]", async () => {
    const response = await checkCart([
      waakyeWithFish({ quantity: 1, optionIds: [chicken.id], seenUnitPricePesewas: 3000 }),
    ]);

    expect(response.body.data.problems).toEqual([]);

    await restaurant.update({ minOrderPesewas: 5000 });
    const belowMinimum = await checkCart([
      waakyeWithFish({ quantity: 1, optionIds: [chicken.id], seenUnitPricePesewas: 3000 }),
    ]);

    expect(problemCodes(belowMinimum.body.data.problems)).toContain("BELOW_MINIMUM_ORDER");
  });

  it("refuses quantities outside 1 to 50 [AC-CART-03]", async () => {
    const response = await checkCart([waakyeWithFish({ quantity: 51 })]);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("refuses an empty cart", async () => {
    const response = await checkCart([]);

    expect(response.status).toBe(400);
  });
});
