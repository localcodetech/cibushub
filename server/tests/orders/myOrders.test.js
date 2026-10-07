import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import {
  Address,
  MenuCategory,
  MenuItem,
  Order,
  OrderStatusHistory,
} from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { createTestUser } from "../helpers/users.js";
import { createOwner, createTestRestaurant } from "../helpers/restaurants.js";

const FRIDAY_NOON = new Date("2026-10-09T12:00:00Z");

let customer;
let otherCustomer;
let restaurant;
let waakye;
let clockMinutes;

// Moves the frozen clock on by one minute, so "newest first" and the timeline have a clear order
const tick = () => {
  clockMinutes += 1;
  vi.setSystemTime(new Date(FRIDAY_NOON.getTime() + clockMinutes * 60 * 1000));
};

const addressFor = (user) =>
  Address.create({ userId: user.id, label: "HOME", latitude: 6.6745, longitude: -1.61 });

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  clockMinutes = 0;
  vi.setSystemTime(FRIDAY_NOON);

  customer = await createTestUser();
  otherCustomer = await createTestUser({ email: "other@example.com", phone: "+233551112222" });
  const owner = await createOwner({
    status: "ACTIVE",
    email: "owner@example.com",
    phone: "+233201112222",
  });
  restaurant = await createTestRestaurant(owner, { status: "APPROVED", deliveryRadiusKm: 5 });
  const category = await MenuCategory.create({ restaurantId: restaurant.id, name: "Rice" });
  waakye = await MenuItem.create({
    restaurantId: restaurant.id,
    categoryId: category.id,
    name: "Waakye",
    pricePesewas: 3000,
    dailyStock: 10,
    stockRemaining: 10,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

const as = (user) => ({
  get: (path) =>
    request(app)
      .get(path)
      .set("Cookie", `access_token=${signAccessToken(user)}`),
  post: (path, body = {}) =>
    request(app)
      .post(path)
      .set("Cookie", `access_token=${signAccessToken(user)}`)
      .send(body),
});

let tapNumber = 0;
const placeOrderFor = async (user, quantity = 2) => {
  const address = await addressFor(user);
  tapNumber += 1;

  const response = await request(app)
    .post("/api/v1/customer/orders")
    .set("Cookie", `access_token=${signAccessToken(user)}`)
    .set("Idempotency-Key", `tap-${tapNumber}-abcdefgh`)
    .send({
      restaurantId: restaurant.id,
      addressId: address.id,
      items: [{ menuItemId: waakye.id, quantity, optionIds: [], seenUnitPricePesewas: 3000 }],
    });

  tick();
  return response.body.data;
};

describe("GET /api/v1/customer/orders [AC-CUST-09]", () => {
  it("lists only my orders, newest first, one page at a time", async () => {
    const older = await placeOrderFor(customer);
    const newer = await placeOrderFor(customer);
    await placeOrderFor(otherCustomer);

    const response = await as(customer).get("/api/v1/customer/orders?pageSize=1");

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe(newer.id);
    expect(response.body.data[0].restaurant.name).toBe(restaurant.name);
    expect(response.body.meta).toMatchObject({
      page: 1,
      pageSize: 1,
      totalItems: 2,
      totalPages: 2,
    });

    const pageTwo = await as(customer).get("/api/v1/customer/orders?page=2&pageSize=1");
    expect(pageTwo.body.data[0].id).toBe(older.id);
  });

  it("filters by status", async () => {
    const order = await placeOrderFor(customer);
    await as(customer).post(`/api/v1/customer/orders/${order.id}/cancel`, {
      reason: "Ordered twice",
    });
    await placeOrderFor(customer);

    const response = await as(customer).get("/api/v1/customer/orders?status=CANCELLED");

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe(order.id);
  });
});

describe("GET /api/v1/customer/orders/:orderId [AC-ORD-06]", () => {
  it("shows the order with its timeline and what I can still do", async () => {
    const order = await placeOrderFor(customer);

    const response = await as(customer).get(`/api/v1/customer/orders/${order.id}`);

    expect(response.status).toBe(200);
    expect(response.body.data.items[0].name).toBe("Waakye");
    expect(response.body.data.timeline).toEqual([
      { status: "PENDING_PAYMENT", at: FRIDAY_NOON.toISOString(), reason: null },
    ]);
    expect(response.body.data.customerActions).toEqual(["CANCELLED"]);
  });

  it("returns 404 for someone else's order [AC-RBAC-04]", async () => {
    const order = await placeOrderFor(otherCustomer);

    const response = await as(customer).get(`/api/v1/customer/orders/${order.id}`);

    expect(response.status).toBe(404);
  });
});

describe("POST /api/v1/customer/orders/:orderId/cancel [AC-CANC-01]", () => {
  it("cancels before the restaurant accepts, keeps the reason and gives the stock back", async () => {
    const order = await placeOrderFor(customer);
    expect((await MenuItem.findByPk(waakye.id)).stockRemaining).toBe(8);

    const response = await as(customer).post(`/api/v1/customer/orders/${order.id}/cancel`, {
      reason: "Ordered by mistake",
    });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("CANCELLED");
    expect(response.body.data.cancellationReason).toBe("Ordered by mistake");
    expect(response.body.data.timeline.map((step) => step.status)).toEqual([
      "PENDING_PAYMENT",
      "CANCELLED",
    ]);
    expect(response.body.data.customerActions).toEqual([]);
    expect((await MenuItem.findByPk(waakye.id)).stockRemaining).toBe(10);
  });

  it("needs a reason", async () => {
    const order = await placeOrderFor(customer);

    const response = await as(customer).post(`/api/v1/customer/orders/${order.id}/cancel`, {});

    expect(response.status).toBe(400);
  });

  it("refuses once the restaurant has accepted [AC-CANC-02]", async () => {
    const order = await placeOrderFor(customer);
    await Order.update({ status: "ACCEPTED" }, { where: { id: order.id } });

    const response = await as(customer).post(`/api/v1/customer/orders/${order.id}/cancel`, {
      reason: "Too slow",
    });

    expect(response.status).toBe(403);
    expect((await Order.findByPk(order.id)).status).toBe("ACCEPTED");
  });

  it("refuses to cancel twice: CANCELLED is final [AC-ORD-07]", async () => {
    const order = await placeOrderFor(customer);
    await as(customer).post(`/api/v1/customer/orders/${order.id}/cancel`, { reason: "First" });

    const response = await as(customer).post(`/api/v1/customer/orders/${order.id}/cancel`, {
      reason: "Second",
    });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("INVALID_STATUS_TRANSITION");
  });

  it("lets only one of two cancels at the same moment through [AC-ORD-05]", async () => {
    const order = await placeOrderFor(customer);

    const results = await Promise.all([
      as(customer).post(`/api/v1/customer/orders/${order.id}/cancel`, { reason: "Tap one" }),
      as(customer).post(`/api/v1/customer/orders/${order.id}/cancel`, { reason: "Tap two" }),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    expect(await OrderStatusHistory.count({ where: { orderId: order.id } })).toBe(2);
    expect((await MenuItem.findByPk(waakye.id)).stockRemaining).toBe(10);
  });

  it("returns 404 for someone else's order", async () => {
    const order = await placeOrderFor(otherCustomer);

    const response = await as(customer).post(`/api/v1/customer/orders/${order.id}/cancel`, {
      reason: "Not mine",
    });

    expect(response.status).toBe(404);
    expect((await Order.findByPk(order.id)).status).toBe("PENDING_PAYMENT");
  });
});
