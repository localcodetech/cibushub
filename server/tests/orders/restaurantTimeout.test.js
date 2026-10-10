import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { Address, MenuCategory, MenuItem } from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { createTestUser } from "../helpers/users.js";
import { createOwner, createTestRestaurant } from "../helpers/restaurants.js";
import { scheduledJobs } from "../helpers/fakeJobs.js";
import {
  rejectUnansweredOrder,
  sweepUnansweredOrders,
} from "../../src/services/order/restaurantTimeout.service.js";
import { Order, Refund } from "../../src/models/index.js";
import { reconcilePayment } from "../../src/services/payment/paystackWebhook.service.js";

vi.mock("../../src/services/payment/paystack.client.js", () => ({
  initializeTransaction: vi.fn(async ({ reference }) => ({
    authorizationUrl: `https://checkout.paystack.com/${reference}`,
    accessCode: "access",
  })),
  verifyTransaction: vi.fn(),
  createRefund: vi.fn(),
  fetchRefund: vi.fn(),
}));

// Pretend email: the receipt email is not what these tests are about
vi.mock("../../src/services/notifications/email.service.js", () => ({
  sendEmail: async () => {},
}));

const paystack = await import("../../src/services/payment/paystack.client.js");

const FRIDAY_NOON = new Date("2026-10-09T12:00:00Z");

let customer;
let owner;
let restaurant;
let order;
let reference;

const as = (user) => ({
  get: (path) =>
    request(app)
      .get(path)
      .set("Cookie", `access_token=${signAccessToken(user)}`),
  post: (path, body) =>
    request(app)
      .post(path)
      .set("Cookie", `access_token=${signAccessToken(user)}`)
      .send(body),
});

beforeEach(async () => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(FRIDAY_NOON);

  customer = await createTestUser({ email: "ama@example.com" });
  owner = await createOwner({
    status: "ACTIVE",
    email: "owner@example.com",
    phone: "+233201112222",
  });
  restaurant = await createTestRestaurant(owner, { status: "APPROVED", prepTimeMinutes: 20 });
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
    .set("Idempotency-Key", "tap-timeout-1")
    .send({
      restaurantId: restaurant.id,
      addressId: address.id,
      items: [{ menuItemId: waakye.id, quantity: 2, optionIds: [], seenUnitPricePesewas: 3000 }],
    });
  order = placed.body.data;

  const started = await as(customer).post(`/api/v1/customer/orders/${order.id}/payments`);
  reference = started.body.data.reference;

  paystack.verifyTransaction.mockResolvedValue({
    status: "success",
    amountPesewas: order.totalPesewas,
    currency: "GHS",
    channel: "mobile_money",
    providerTransactionId: "1",
    gatewayResponse: "Approved",
    paidAt: FRIDAY_NOON,
  });
  // Paid: now it is the restaurant's turn
  await reconcilePayment(reference);
});

afterEach(() => {
  vi.useRealTimers();
});

const minutesAfterPayment = (minutes) => new Date(FRIDAY_NOON.getTime() + minutes * 60 * 1000);

describe("Restaurant timeout [AC-RORD-04]", () => {
  it("is scheduled the moment the order is paid", () => {
    expect(scheduledJobs).toContainEqual({ name: "rejectUnansweredOrder", orderId: order.id });
  });

  it("does nothing before 5 minutes have passed", async () => {
    const result = await rejectUnansweredOrder(order.id, minutesAfterPayment(4));

    expect(result).toBe("NOT_DUE");
    expect((await Order.findByPk(order.id)).status).toBe("PAID");
  });

  it("rejects after 5 minutes with RESTAURANT_TIMEOUT and refunds in full", async () => {
    const result = await rejectUnansweredOrder(order.id, minutesAfterPayment(5));

    expect(result).toBe("REJECTED");
    const saved = await Order.findByPk(order.id);
    expect(saved.status).toBe("REJECTED");
    expect(saved.cancellationReason).toBe("RESTAURANT_TIMEOUT");
    const refund = await Refund.findOne({ where: { orderId: order.id } });
    expect(refund.amountPesewas).toBe(order.totalPesewas);
    expect(scheduledJobs).toContainEqual({ name: "processRefund", refundId: refund.id });
  });

  it("leaves the order alone if the restaurant accepted in time", async () => {
    await as(owner).post(`/api/v1/owner/orders/${order.id}/accept`);

    const result = await rejectUnansweredOrder(order.id, minutesAfterPayment(10));

    expect(result).toBe("ANSWERED");
    expect((await Order.findByPk(order.id)).status).toBe("ACCEPTED");
    expect(await Refund.count({ where: { orderId: order.id } })).toBe(0);
  });

  it("the every-minute sweep catches it even if the delayed job was lost", async () => {
    const early = await sweepUnansweredOrders(minutesAfterPayment(3));
    const late = await sweepUnansweredOrders(minutesAfterPayment(6));

    expect(early).toEqual({ checked: 0, rejected: 0 });
    expect(late).toEqual({ checked: 1, rejected: 1 });
    expect((await Order.findByPk(order.id)).status).toBe("REJECTED");
  });

  it("running the job twice refunds only once", async () => {
    await rejectUnansweredOrder(order.id, minutesAfterPayment(6));
    const second = await rejectUnansweredOrder(order.id, minutesAfterPayment(7));

    expect(second).toBe("ANSWERED");
    expect(await Refund.count({ where: { orderId: order.id } })).toBe(1);
  });
});
