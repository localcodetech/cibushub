import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { Address, MenuCategory, MenuItem } from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { createTestUser } from "../helpers/users.js";
import { createOwner, createTestRestaurant } from "../helpers/restaurants.js";
import { sentEmails } from "../helpers/fakeEmail.js";
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
let order;
let reference;

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
    .set("Idempotency-Key", "tap-receipt-1")
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
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Receipt [AC-PAY-15]", () => {
  it("is emailed once when the order is paid, even if Paystack tells us twice", async () => {
    await reconcilePayment(reference);
    await reconcilePayment(reference);

    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].to).toBe("ama@example.com");
    expect(sentEmails[0].subject).toContain(order.orderNumber);
    expect(sentEmails[0].text).toContain("2 × Waakye: GHS 60.00");
    expect(sentEmails[0].text).toContain(`Paid with Mobile money · reference ${reference}`);
    expect(sentEmails[0].html).toContain("Thanks for your order!"); // the branded version too
  });

  it("can be viewed in the app once paid, with items, fees, total, method and reference", async () => {
    await reconcilePayment(reference);

    const response = await as(customer).get(`/api/v1/customer/orders/${order.id}/receipt`);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      customerName: expect.any(String),
      contactPhone: expect.stringMatching(/^\+233/),
      placedAt: expect.any(String),
      paymentStatus: "PAID",
      restaurantAddress: expect.any(String),
    });
    expect(response.body.data).toMatchObject({
      orderNumber: order.orderNumber,
      paymentMethod: "Mobile money",
      paymentReference: reference,
      subtotalPesewas: 6000,
      deliveryFeePesewas: order.deliveryFeePesewas,
      totalPesewas: order.totalPesewas,
    });
    expect(response.body.data.items[0]).toMatchObject({
      name: "Waakye",
      quantity: 2,
      lineTotalPesewas: 6000,
    });
  });

  it("is not available before payment", async () => {
    const response = await as(customer).get(`/api/v1/customer/orders/${order.id}/receipt`);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("RECEIPT_NOT_AVAILABLE");
  });

  it("returns 404 for someone else's order", async () => {
    await reconcilePayment(reference);
    const stranger = await createTestUser({ email: "kofi@example.com", phone: "+233551112222" });

    const response = await as(stranger).get(`/api/v1/customer/orders/${order.id}/receipt`);

    expect(response.status).toBe(404);
  });
});

// Collects a file response into a Buffer, so the test can look at its bytes
const asFile = (response, done) => {
  const pieces = [];
  response.on("data", (piece) => pieces.push(piece));
  response.on("end", () => done(null, Buffer.concat(pieces)));
};

describe("Receipt PDF download [AC-PAY-17]", () => {
  it("downloads a PDF file named after the order", async () => {
    await reconcilePayment(reference);

    const response = await as(customer)
      .get(`/api/v1/customer/orders/${order.id}/receipt/pdf`)
      .buffer(true)
      .parse(asFile);

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("application/pdf");
    expect(response.headers["content-disposition"]).toBe(
      `attachment; filename="CibusHub-receipt-${order.orderNumber}.pdf"`,
    );
    expect(response.headers["cache-control"]).toBe("no-store");
    // Every PDF file starts with "%PDF"
    expect(response.body.subarray(0, 4).toString()).toBe("%PDF");
    expect(response.body.length).toBeGreaterThan(1000);
  });

  it("is not available before payment", async () => {
    const response = await as(customer).get(`/api/v1/customer/orders/${order.id}/receipt/pdf`);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("RECEIPT_NOT_AVAILABLE");
  });

  it("returns 404 for someone else's order", async () => {
    await reconcilePayment(reference);
    const stranger = await createTestUser({ email: "kofi@example.com", phone: "+233551112222" });

    const response = await as(stranger).get(`/api/v1/customer/orders/${order.id}/receipt/pdf`);

    expect(response.status).toBe(404);
  });
});
