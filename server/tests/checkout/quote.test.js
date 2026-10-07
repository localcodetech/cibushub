import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { Address, MenuCategory, MenuItem } from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { createTestUser } from "../helpers/users.js";
import { createOwner, createTestRestaurant } from "../helpers/restaurants.js";
import { deliveryFeeFor, estimateRoadMeters } from "../../src/utils/delivery/deliveryFee.js";

const FRIDAY_NOON = new Date("2026-10-09T12:00:00Z");

let customer;
let restaurant;
let waakye;
let nearbyAddress;
let farAddress;

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(FRIDAY_NOON);

  customer = await createTestUser({ phone: "+233241234567" });
  const owner = await createOwner({
    status: "ACTIVE",
    email: "owner@example.com",
    phone: "+233201112222",
  });

  // In Adum, delivering up to 5 km
  restaurant = await createTestRestaurant(owner, { status: "APPROVED", deliveryRadiusKm: 5 });
  const category = await MenuCategory.create({ restaurantId: restaurant.id, name: "Rice" });
  waakye = await MenuItem.create({
    restaurantId: restaurant.id,
    categoryId: category.id,
    name: "Waakye",
    pricePesewas: 3000,
  });

  // About 2 km from the restaurant, and about 6 km away (KNUST)
  nearbyAddress = await Address.create({
    userId: customer.id,
    label: "HOME",
    latitude: 6.6745,
    longitude: -1.61,
  });
  farAddress = await Address.create({
    userId: customer.id,
    label: "WORK",
    latitude: 6.6745,
    longitude: -1.5716,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

const quoteAs = (user, body) => {
  return request(app)
    .post("/api/v1/customer/checkout/quote")
    .set("Cookie", `access_token=${signAccessToken(user)}`)
    .send(body);
};

const twoWaakye = (overrides = {}) => ({
  restaurantId: restaurant.id,
  addressId: nearbyAddress.id,
  items: [{ menuItemId: waakye.id, quantity: 2, optionIds: [], seenUnitPricePesewas: 3000 }],
  ...overrides,
});

describe("POST /api/v1/customer/checkout/quote [AC-CHK-01]", () => {
  it("returns the full summary: items, fees, total, address and phone", async () => {
    const response = await quoteAs(customer, twoWaakye());
    const quote = response.body.data;

    expect(response.status).toBe(200);
    expect(quote.subtotalPesewas).toBe(6000);
    expect(quote.serviceFeePesewas).toBe(0);
    expect(quote.discountPesewas).toBe(0);
    expect(quote.totalPesewas).toBe(6000 + quote.deliveryFeePesewas);
    expect(quote.deliveryAddress.id).toBe(nearbyAddress.id);
    expect(quote.contactPhone).toBe("+233241234567");
    expect(quote.paymentMethods).toEqual(["PAYSTACK"]);
    expect(quote.canPlaceOrder).toBe(true);
  });

  it("works out the delivery fee from distance with the documented formula [AC-CHK-03, AC-MAP-06]", async () => {
    const response = await quoteAs(customer, twoWaakye());
    const roadMeters = estimateRoadMeters(restaurant, nearbyAddress);

    expect(response.body.data.delivery.roadMeters).toBe(roadMeters);
    expect(response.body.data.deliveryFeePesewas).toBe(deliveryFeeFor(roadMeters));
    expect(response.body.data.pricingSnapshot.distanceSource).toBe("HAVERSINE");
  });

  it("blocks an address outside the delivery radius [AC-CHK-04]", async () => {
    const response = await quoteAs(customer, twoWaakye({ addressId: farAddress.id }));

    expect(response.body.data.delivery.isInRange).toBe(false);
    expect(response.body.data.problems.map((found) => found.code)).toContain(
      "OUT_OF_DELIVERY_RANGE",
    );
    expect(response.body.data.canPlaceOrder).toBe(false);
  });

  it("passes on cart problems, e.g. a sold-out item", async () => {
    await waakye.update({ isAvailable: false });

    const response = await quoteAs(customer, twoWaakye());

    expect(response.body.data.canPlaceOrder).toBe(false);
  });

  it("returns 404 for another customer's address [AC-RBAC-04]", async () => {
    const otherCustomer = await createTestUser({
      email: "other@example.com",
      phone: "+233551112222",
    });

    const response = await quoteAs(otherCustomer, twoWaakye());

    expect(response.status).toBe(404);
  });

  it("refuses prices or totals sent by the browser [AC-CHK-02]", async () => {
    const response = await quoteAs(customer, twoWaakye({ totalPesewas: 1 }));

    expect(response.status).toBe(400);
  });

  it("is for customers only", async () => {
    const owner = await createOwner({
      status: "ACTIVE",
      email: "owner2@example.com",
      phone: "+233209998888",
    });

    const response = await quoteAs(owner, twoWaakye());

    expect(response.status).toBe(403);
  });
});
