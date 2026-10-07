import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import {
  Address,
  AuditLog,
  MenuCategory,
  MenuItem,
  Order,
  Refund,
} from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { createTestUser } from "../helpers/users.js";
import { createOwner, createTestRestaurant } from "../helpers/restaurants.js";
import { scheduledJobs } from "../helpers/fakeJobs.js";
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

const paystack = await import("../../src/services/payment/paystack.client.js");

const FRIDAY_NOON = new Date("2026-10-09T12:00:00Z");

let customer;
let admin;
let waakye;
let order;

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

// Places an order and, if `paid`, pays it through the same code the webhook uses
const placeOrder = async ({ paid }) => {
  const address = await Address.create({
    userId: customer.id,
    label: "HOME",
    latitude: 6.6745,
    longitude: -1.61,
  });

  const placed = await request(app)
    .post("/api/v1/customer/orders")
    .set("Cookie", `access_token=${signAccessToken(customer)}`)
    .set("Idempotency-Key", "tap-cancel-123")
    .send({
      restaurantId: waakye.restaurantId,
      addressId: address.id,
      items: [{ menuItemId: waakye.id, quantity: 2, optionIds: [], seenUnitPricePesewas: 3000 }],
    });
  order = placed.body.data;

  if (paid) {
    const started = await as(customer).post(`/api/v1/customer/orders/${order.id}/payments`);
    paystack.verifyTransaction.mockResolvedValue({
      status: "success",
      amountPesewas: order.totalPesewas,
      currency: "GHS",
      channel: "mobile_money",
      providerTransactionId: "1",
      gatewayResponse: "Approved",
      paidAt: FRIDAY_NOON,
    });
    await reconcilePayment(started.body.data.reference);
  }
};

beforeEach(async () => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(FRIDAY_NOON);

  customer = await createTestUser();
  admin = await createTestUser({
    role: "ADMIN",
    email: "admin@example.com",
    phone: "+233209998888",
  });
  const owner = await createOwner({
    status: "ACTIVE",
    email: "owner@example.com",
    phone: "+233201112222",
  });
  const restaurant = await createTestRestaurant(owner, { status: "APPROVED" });
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

describe("Customer cancels a paid order before the restaurant accepts [AC-CANC-01]", () => {
  it("cancels, starts a full refund at once and gives the stock back", async () => {
    await placeOrder({ paid: true });

    const response = await as(customer).post(`/api/v1/customer/orders/${order.id}/cancel`, {
      reason: "Ordered the wrong dish",
    });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("CANCELLED");
    expect(response.body.data.refunds).toHaveLength(1);
    expect(response.body.data.refunds[0]).toMatchObject({
      amountPesewas: order.totalPesewas,
      status: "PENDING",
    });

    const refund = await Refund.findOne({ where: { orderId: order.id } });
    expect(refund.initiatedByRole).toBe("CUSTOMER");
    expect(scheduledJobs).toContainEqual({ name: "processRefund", refundId: refund.id });
    expect((await MenuItem.findByPk(waakye.id)).stockRemaining).toBe(10);
  });

  it("starts no refund for an order that was never paid", async () => {
    await placeOrder({ paid: false });

    await as(customer).post(`/api/v1/customer/orders/${order.id}/cancel`, {
      reason: "Changed my mind",
    });

    expect(await Refund.count()).toBe(0);
  });
});

describe("POST /api/v1/admin/orders/:orderId/cancel [AC-CANC-03]", () => {
  const adminCancel = (body, user = admin) =>
    as(user).post(`/api/v1/admin/orders/${order.id}/cancel`, body);

  it("cancels an accepted order with a FULL refund and writes the audit log [AC-ADM-07]", async () => {
    await placeOrder({ paid: true });
    await Order.update({ status: "ACCEPTED" }, { where: { id: order.id } });

    const response = await adminCancel({
      reason: "Restaurant ran out of gas",
      refund: "FULL",
    });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("CANCELLED");
    expect(response.body.data.refunds[0].amountPesewas).toBe(order.totalPesewas);

    const audit = await AuditLog.findOne({ where: { targetId: order.id } });
    expect(audit).toMatchObject({
      actorId: admin.id,
      action: "ORDER_CANCELLED",
      targetType: "order",
      reason: "Restaurant ran out of gas",
    });
    expect(audit.before).toEqual({ status: "ACCEPTED", paymentStatus: "PAID" });
    expect(audit.after).toMatchObject({ refund: "FULL", refundAmountPesewas: order.totalPesewas });
  });

  it("gives back only part with a PARTIAL refund", async () => {
    await placeOrder({ paid: true });

    await adminCancel({
      reason: "One dish was missing",
      refund: "PARTIAL",
      refundAmountPesewas: 1500,
    });

    expect((await Refund.findOne()).amountPesewas).toBe(1500);
  });

  it("gives nothing back with NONE", async () => {
    await placeOrder({ paid: true });

    const response = await adminCancel({ reason: "Customer asked to keep it", refund: "NONE" });

    expect(response.status).toBe(200);
    expect(await Refund.count()).toBe(0);
  });

  it("refuses a refund larger than the payment, and does NOT cancel the order [AC-CANC-05]", async () => {
    await placeOrder({ paid: true });

    const response = await adminCancel({
      reason: "Testing the refund limit",
      refund: "PARTIAL",
      refundAmountPesewas: order.totalPesewas + 1,
    });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("REFUND_EXCEEDS_PAID");
    expect((await Order.findByPk(order.id)).status).toBe("PAID");
    expect(await AuditLog.count()).toBe(0);
  });

  it("refuses a FULL refund on an unpaid order, and does NOT cancel it", async () => {
    await placeOrder({ paid: false });

    const response = await adminCancel({ reason: "Testing an unpaid order", refund: "FULL" });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("NOTHING_TO_REFUND");
    expect((await Order.findByPk(order.id)).status).toBe("PENDING_PAYMENT");
  });

  it("needs a clear reason, and an amount only for PARTIAL [AC-ADM-08]", async () => {
    await placeOrder({ paid: true });

    expect((await adminCancel({ reason: "short", refund: "NONE" })).status).toBe(400);
    expect((await adminCancel({ reason: "A clear reason here", refund: "PARTIAL" })).status).toBe(
      400,
    );
    expect(
      (
        await adminCancel({
          reason: "A clear reason here",
          refund: "FULL",
          refundAmountPesewas: 100,
        })
      ).status,
    ).toBe(400);
  });

  it("cannot cancel a delivered order [AC-ORD-07]", async () => {
    await placeOrder({ paid: true });
    await Order.update({ status: "DELIVERED" }, { where: { id: order.id } });

    const response = await adminCancel({ reason: "Too late to cancel", refund: "NONE" });

    expect(response.status).toBe(409);
  });

  it("lets a super admin cancel too", async () => {
    await placeOrder({ paid: false });
    const superAdmin = await createTestUser({
      role: "SUPER_ADMIN",
      email: "boss@example.com",
      phone: "+233205556666",
    });

    const response = await adminCancel({ reason: "Duplicate order", refund: "NONE" }, superAdmin);

    expect(response.status).toBe(200);
  });

  it("blocks customers", async () => {
    await placeOrder({ paid: false });

    const response = await adminCancel({ reason: "Not my job to do", refund: "NONE" }, customer);

    expect(response.status).toBe(403);
  });
});
