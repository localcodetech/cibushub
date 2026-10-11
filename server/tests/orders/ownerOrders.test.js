import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { Address, MenuCategory, MenuItem } from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { createTestUser } from "../helpers/users.js";
import { createOwner, createTestRestaurant } from "../helpers/restaurants.js";
import { scheduledJobs } from "../helpers/fakeJobs.js";
import { sentSms } from "../helpers/fakeSms.js";
import { sentEmails } from "../helpers/fakeEmail.js";
import { notifyOrderStatus } from "../../src/services/notifications/orderStatusNotice.service.js";
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
    .set("Idempotency-Key", "tap-owner-1")
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

const ordersUrl = "/api/v1/owner/orders";

describe("Owner board and kitchen view [AC-RORD-02, AC-RORD-06]", () => {
  it("shows the paid order with what the kitchen needs, and no phone or address", async () => {
    const response = await as(owner).get(ordersUrl);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    const seen = response.body.data[0];
    expect(seen).toMatchObject({
      id: order.id,
      orderNumber: order.orderNumber,
      status: "PAID",
      customerFirstName: "Test",
      items: [{ name: "Waakye", quantity: 2, options: [] }],
      ownerActions: ["ACCEPTED", "REJECTED"],
    });
    expect(seen.paidAt).toBeTruthy();
    // Never sent to the restaurant [AC-RORD-02]
    const text = JSON.stringify(seen);
    expect(text).not.toContain(customer.phone);
    expect(seen).not.toHaveProperty("contactPhone");
    expect(seen).not.toHaveProperty("deliveryLatitude");
    expect(seen).not.toHaveProperty("deliveryLandmark");
  });

  it("hides another restaurant's orders: 404 and an empty board", async () => {
    const otherOwner = await createOwner({
      status: "ACTIVE",
      email: "other@example.com",
      phone: "+233209998888",
    });
    await createTestRestaurant(otherOwner, { status: "APPROVED", name: "Other Kitchen" });

    const board = await as(otherOwner).get(ordersUrl);
    const one = await as(otherOwner).get(`${ordersUrl}/${order.id}`);
    const accept = await as(otherOwner).post(`${ordersUrl}/${order.id}/accept`, {});

    expect(board.body.data).toEqual([]);
    expect(one.status).toBe(404);
    expect(accept.status).toBe(404);
  });

  it("is for active restaurant owners only", async () => {
    const asCustomer = await as(customer).get(ordersUrl);
    const pendingOwner = await createOwner({ email: "new@example.com", phone: "+233207776666" });
    const asPending = await as(pendingOwner).get(ordersUrl);

    expect(asCustomer.status).toBe(403);
    expect(asPending.status).toBe(403);
  });
});

describe("Accept or reject [AC-RORD-03]", () => {
  it("accepts with the owner's preparation time and tells when it will be ready", async () => {
    const response = await as(owner).post(`${ordersUrl}/${order.id}/accept`, {
      prepTimeMinutes: 25,
    });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("ACCEPTED");
    expect(new Date(response.body.data.estimatedReadyAt).getTime()).toBe(
      FRIDAY_NOON.getTime() + 25 * 60 * 1000,
    );
    expect(response.body.data.ownerActions).toEqual(["PREPARING"]);
  });

  it("uses the restaurant's usual preparation time when none is given", async () => {
    const response = await as(owner).post(`${ordersUrl}/${order.id}/accept`);

    expect(response.status).toBe(200);
    expect(new Date(response.body.data.estimatedReadyAt).getTime()).toBe(
      FRIDAY_NOON.getTime() + 20 * 60 * 1000,
    );
  });

  it("needs a reason to reject", async () => {
    const response = await as(owner).post(`${ordersUrl}/${order.id}/reject`, {});

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects with the reason and refunds the customer in full", async () => {
    const response = await as(owner).post(`${ordersUrl}/${order.id}/reject`, {
      reason: "Kitchen closing early",
    });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("REJECTED");
    const saved = await Order.findByPk(order.id);
    expect(saved.cancellationReason).toBe("Kitchen closing early");
    const refund = await Refund.findOne({ where: { orderId: order.id } });
    expect(refund.amountPesewas).toBe(order.totalPesewas);
    expect(scheduledJobs).toContainEqual({ name: "processRefund", refundId: refund.id });
  });

  it("can't accept an order that isn't paid yet", async () => {
    await as(owner).post(`${ordersUrl}/${order.id}/accept`);

    const again = await as(owner).post(`${ordersUrl}/${order.id}/accept`);

    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("INVALID_STATUS_TRANSITION");
  });
});

describe("The customer hears about it [AC-NOTIF-01, AC-NOTIF-04, AC-NOTIF-06]", () => {
  const smsTo = (phone) => sentSms.filter((sms) => sms.phone === phone);

  it("accepted: an SMS with the order number and when it will be ready (Ghana time)", async () => {
    await as(owner).post(`${ordersUrl}/${order.id}/accept`, { prepTimeMinutes: 25 });

    const messages = smsTo(customer.phone);
    expect(messages).toHaveLength(1);
    expect(messages[0].message).toContain(order.orderNumber);
    expect(messages[0].message).toContain("around 12:25"); // Ghana is UTC all year
    expect(messages[0].message.length).toBeLessThanOrEqual(160);
  });

  it("rejected: an SMS and an email with the restaurant's reason", async () => {
    await as(owner).post(`${ordersUrl}/${order.id}/reject`, { reason: "Kitchen closing early" });

    expect(smsTo(customer.phone)[0].message).toContain("full refund");
    const email = sentEmails.find((sent) => sent.subject.includes("couldn't go ahead"));
    expect(email.to).toBe("ama@example.com");
    expect(email.text).toContain("Kitchen closing early");
    expect(email.html).toContain("Sorry, your order couldn&#39;t go ahead");
  });

  it("picked up: an SMS without the delivery code; delivered: an email", async () => {
    const saved = await Order.findByPk(order.id);

    saved.status = "PICKED_UP";
    await notifyOrderStatus(saved);
    saved.status = "DELIVERED";
    await notifyOrderStatus(saved);

    const [pickedUp] = smsTo(customer.phone);
    expect(pickedUp.message).toContain("on the way");
    expect(pickedUp.message).not.toMatch(/\b\d{4}\b/); // no 4-digit code
    expect(sentEmails.map((sent) => sent.subject)).toContain(
      `Order ${order.orderNumber} was delivered`,
    );
  });

  it("is sent once only, even if the same status is announced twice", async () => {
    const saved = await Order.findByPk(order.id);
    saved.status = "PICKED_UP";

    await notifyOrderStatus(saved);
    await notifyOrderStatus(saved);

    expect(smsTo(customer.phone)).toHaveLength(1);
  });
});

describe("Preparation progress [AC-RORD-05]", () => {
  it("moves accepted -> preparing -> ready, one tap each", async () => {
    await as(owner).post(`${ordersUrl}/${order.id}/accept`);

    const preparing = await as(owner).post(`${ordersUrl}/${order.id}/preparing`);
    const ready = await as(owner).post(`${ordersUrl}/${order.id}/ready`);

    expect(preparing.body.data.status).toBe("PREPARING");
    expect(ready.body.data.status).toBe("READY_FOR_PICKUP");
    expect(ready.body.data.ownerActions).toEqual([]);
  });

  it("refuses to skip a step", async () => {
    await as(owner).post(`${ordersUrl}/${order.id}/accept`);

    const response = await as(owner).post(`${ordersUrl}/${order.id}/ready`);

    expect(response.status).toBe(409);
  });
});

describe("History and daily summary [AC-RORD-07]", () => {
  it("lists the day's orders, newest first", async () => {
    const response = await as(owner).get(`${ordersUrl}/history?from=2026-10-09&to=2026-10-09`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([
      expect.objectContaining({ id: order.id, status: "PAID", subtotalPesewas: 6000 }),
    ]);
    expect(response.body.meta.totalItems).toBe(1);
  });

  it("finds nothing on another day", async () => {
    const response = await as(owner).get(`${ordersUrl}/history?from=2026-10-08&to=2026-10-08`);

    expect(response.body.data).toEqual([]);
  });

  it("sums the day: counts every order, but rejected ones earn nothing", async () => {
    const before = await as(owner).get(`${ordersUrl}/summary?date=2026-10-09`);
    await as(owner).post(`${ordersUrl}/${order.id}/reject`, { reason: "Out of waakye" });
    const after = await as(owner).get(`${ordersUrl}/summary?date=2026-10-09`);

    expect(before.body.data).toMatchObject({
      date: "2026-10-09",
      orderCount: 1,
      byStatus: { PAID: 1 },
      salesPesewas: 6000,
    });
    expect(before.body.data.earningsPesewas).toBeGreaterThan(0);
    expect(after.body.data).toMatchObject({
      orderCount: 1,
      byStatus: { REJECTED: 1 },
      salesPesewas: 0,
      earningsPesewas: 0,
    });
  });

  it("leaves out an order cancelled before it was paid: the kitchen never saw it", async () => {
    const unpaid = await request(app)
      .post("/api/v1/customer/orders")
      .set("Cookie", `access_token=${signAccessToken(customer)}`)
      .set("Idempotency-Key", "tap-owner-unpaid")
      .send({
        restaurantId: restaurant.id,
        addressId: (await Address.findOne({ where: { userId: customer.id } })).id,
        items: [
          {
            menuItemId: order.items[0].menuItemId,
            quantity: 1,
            optionIds: [],
            seenUnitPricePesewas: 3000,
          },
        ],
      });
    await as(customer).post(`/api/v1/customer/orders/${unpaid.body.data.id}/cancel`, {
      reason: "Changed my mind",
    });

    const history = await as(owner).get(`${ordersUrl}/history?from=2026-10-09&to=2026-10-09`);
    const summary = await as(owner).get(`${ordersUrl}/summary?date=2026-10-09`);

    expect(history.body.data.map((seen) => seen.id)).toEqual([order.id]);
    expect(summary.body.data).toMatchObject({ orderCount: 1, byStatus: { PAID: 1 } });
  });

  it("rejects 'from' after 'to'", async () => {
    const response = await as(owner).get(`${ordersUrl}/history?from=2026-10-10&to=2026-10-09`);

    expect(response.status).toBe(400);
  });
});
