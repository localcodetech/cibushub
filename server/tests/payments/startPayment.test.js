import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { Address, MenuCategory, MenuItem, Order, Payment } from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { createTestUser } from "../helpers/users.js";
import { createOwner, createTestRestaurant } from "../helpers/restaurants.js";

// Pretend Paystack: tests never call the real service
vi.mock("../../src/services/payment/paystack.client.js", () => ({
  initializeTransaction: vi.fn(async ({ reference }) => ({
    authorizationUrl: `https://checkout.paystack.com/${reference}`,
    accessCode: `access-${reference}`,
  })),
  verifyTransaction: vi.fn(),
}));

const { initializeTransaction } = await import("../../src/services/payment/paystack.client.js");

const FRIDAY_NOON = new Date("2026-10-09T12:00:00Z");

let customer;
let order;

beforeEach(async () => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(FRIDAY_NOON);

  customer = await createTestUser({ email: "ama@example.com" });
  const owner = await createOwner({
    status: "ACTIVE",
    email: "owner@example.com",
    phone: "+233201112222",
  });
  const restaurant = await createTestRestaurant(owner, { status: "APPROVED" });
  const category = await MenuCategory.create({ restaurantId: restaurant.id, name: "Rice" });
  const waakye = await MenuItem.create({
    restaurantId: restaurant.id,
    categoryId: category.id,
    name: "Waakye",
    pricePesewas: 3000,
  });
  const address = await Address.create({
    userId: customer.id,
    label: "HOME",
    latitude: 6.6745,
    longitude: -1.61,
  });

  const placed = await request(app)
    .post("/api/v1/customer/orders")
    .set("Cookie", `access_token=${signAccessToken(customer)}`)
    .set("Idempotency-Key", "tap-pay-12345")
    .send({
      restaurantId: restaurant.id,
      addressId: address.id,
      items: [{ menuItemId: waakye.id, quantity: 2, optionIds: [], seenUnitPricePesewas: 3000 }],
    });
  order = placed.body.data;
});

afterEach(() => {
  vi.useRealTimers();
});

const payAs = (user, orderId = order.id) => {
  return request(app)
    .post(`/api/v1/customer/orders/${orderId}/payments`)
    .set("Cookie", `access_token=${signAccessToken(user)}`)
    .send({});
};

describe("POST /api/v1/customer/orders/:orderId/payments [AC-PAY-01]", () => {
  it("starts a Paystack payment for the order's stored total, in GHS, card or mobile money", async () => {
    const response = await payAs(customer);

    expect(response.status).toBe(200);
    expect(response.body.data.amountPesewas).toBe(order.totalPesewas);
    expect(response.body.data.authorizationUrl).toContain("checkout.paystack.com");
    expect(response.body.data.reference).toMatch(new RegExp(`^${order.orderNumber}-[0-9A-F]{6}$`));

    expect(initializeTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "ama@example.com",
        amountPesewas: order.totalPesewas,
        metadata: { orderId: order.id, orderNumber: order.orderNumber },
      }),
    );

    const saved = await Payment.findOne({ where: { orderId: order.id } });
    expect(saved.status).toBe("PENDING");
    expect(saved.currency).toBe("GHS");
  });

  it("reuses the same checkout for a double tap", async () => {
    const first = await payAs(customer);
    const second = await payAs(customer);

    expect(second.body.data.reference).toBe(first.body.data.reference);
    expect(initializeTransaction).toHaveBeenCalledTimes(1);
    expect(await Payment.count()).toBe(1);
  });

  it("starts a new attempt when the customer retries later [AC-PAY-10]", async () => {
    const first = await payAs(customer);
    await Payment.update({ status: "FAILED" }, { where: { reference: first.body.data.reference } });

    const retry = await payAs(customer);

    expect(retry.body.data.reference).not.toBe(first.body.data.reference);
    expect(await Payment.count()).toBe(2);
  });

  it("refuses an order that is no longer waiting for payment", async () => {
    await Order.update({ status: "CANCELLED" }, { where: { id: order.id } });

    const response = await payAs(customer);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("ORDER_NOT_PAYABLE");
  });

  it("returns 404 for someone else's order", async () => {
    const stranger = await createTestUser({ email: "kofi@example.com", phone: "+233551112222" });

    const response = await payAs(stranger);

    expect(response.status).toBe(404);
    expect(initializeTransaction).not.toHaveBeenCalled();
  });
});
