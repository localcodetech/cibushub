import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import env from "../../src/config/env/env.js";
import AppError from "../../src/utils/AppError.js";
import {
  Address,
  MenuCategory,
  MenuItem,
  Order,
  OrderStatusHistory,
  Payment,
} from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { createTestUser } from "../helpers/users.js";
import { createOwner, createTestRestaurant } from "../helpers/restaurants.js";
import { sentEmails } from "../helpers/fakeEmail.js";

// Pretend Paystack: the test decides what "verify" answers
vi.mock("../../src/services/payment/paystack.client.js", () => ({
  initializeTransaction: vi.fn(async ({ reference }) => ({
    authorizationUrl: `https://checkout.paystack.com/${reference}`,
    accessCode: "access",
  })),
  verifyTransaction: vi.fn(),
}));

const { verifyTransaction } = await import("../../src/services/payment/paystack.client.js");

vi.mock("../../src/sockets/emitAdminAlert.js", () => ({ emitAdminAlert: vi.fn() }));
const { emitAdminAlert } = await import("../../src/sockets/emitAdminAlert.js");

const FRIDAY_NOON = new Date("2026-10-09T12:00:00Z");

let customer;
let order;
let reference;

beforeEach(async () => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(FRIDAY_NOON);

  customer = await createTestUser();
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

  const cookie = `access_token=${signAccessToken(customer)}`;
  const placed = await request(app)
    .post("/api/v1/customer/orders")
    .set("Cookie", cookie)
    .set("Idempotency-Key", "tap-webhook-1")
    .send({
      restaurantId: restaurant.id,
      addressId: address.id,
      items: [{ menuItemId: waakye.id, quantity: 2, optionIds: [], seenUnitPricePesewas: 3000 }],
    });
  order = placed.body.data;

  const started = await request(app)
    .post(`/api/v1/customer/orders/${order.id}/payments`)
    .set("Cookie", cookie)
    .send({});
  reference = started.body.data.reference;

  // By default Paystack confirms the exact amount, paid by mobile money
  verifyTransaction.mockResolvedValue({
    status: "success",
    amountPesewas: order.totalPesewas,
    currency: "GHS",
    reference,
    channel: "mobile_money",
    providerTransactionId: "4099260516",
    gatewayResponse: "Approved",
    paidAt: FRIDAY_NOON,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

// Sends a webhook exactly like Paystack: raw JSON text, signed with the secret key
const sendWebhook = (event, signature) => {
  const rawBody = JSON.stringify(event);
  const validSignature = createHmac("sha512", env.PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest("hex");

  return request(app)
    .post("/api/v1/webhooks/paystack")
    .set("Content-Type", "application/json")
    .set("x-paystack-signature", signature ?? validSignature)
    .send(rawBody);
};

const chargeSuccess = () => ({
  event: "charge.success",
  data: { reference, amount: order.totalPesewas, currency: "GHS" },
});

describe("POST /api/v1/webhooks/paystack", () => {
  it("rejects a wrong signature with 401 and changes nothing [AC-PAY-04]", async () => {
    const response = await sendWebhook(chargeSuccess(), "f".repeat(128));

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("INVALID_SIGNATURE");
    expect(verifyTransaction).not.toHaveBeenCalled();
    expect((await Order.findByPk(order.id)).status).toBe("PENDING_PAYMENT");
  });

  it("rejects a missing signature", async () => {
    const response = await request(app)
      .post("/api/v1/webhooks/paystack")
      .set("Content-Type", "application/json")
      .send(JSON.stringify(chargeSuccess()));

    expect(response.status).toBe(401);
  });

  it("marks the order PAID only after Paystack confirms it [AC-PAY-05]", async () => {
    const response = await sendWebhook(chargeSuccess());

    expect(response.status).toBe(200);
    expect(response.body.data.outcome).toBe("ORDER_PAID");
    expect(verifyTransaction).toHaveBeenCalledWith(reference);

    const paidOrder = await Order.findByPk(order.id);
    expect(paidOrder.status).toBe("PAID");
    expect(paidOrder.paymentStatus).toBe("PAID");

    const payment = await Payment.findOne({ where: { reference } });
    expect(payment.status).toBe("SUCCESS");
    expect(payment.channel).toBe("mobile_money");
    expect(payment.providerTransactionId).toBe("4099260516");

    const lastStep = await OrderStatusHistory.findOne({
      where: { orderId: order.id, toStatus: "PAID" },
    });
    expect(lastStep.actorRole).toBe("SYSTEM");
    expect(lastStep.actorUserId).toBeNull();
  });

  it("handles the same event twice only once, and still answers 200 [AC-PAY-07]", async () => {
    await sendWebhook(chargeSuccess());
    const repeat = await sendWebhook(chargeSuccess());

    expect(repeat.status).toBe(200);
    expect(repeat.body.data.outcome).toBe("ALREADY_PROCESSED");
    expect(await OrderStatusHistory.count({ where: { orderId: order.id } })).toBe(2);
  });

  it("handles two copies arriving at the same moment only once [AC-PAY-07]", async () => {
    const results = await Promise.all([sendWebhook(chargeSuccess()), sendWebhook(chargeSuccess())]);

    expect(results.map((result) => result.status)).toEqual([200, 200]);
    expect(results.map((result) => result.body.data.outcome).sort()).toEqual([
      "ALREADY_PROCESSED",
      "ORDER_PAID",
    ]);
    expect(await OrderStatusHistory.count({ where: { orderId: order.id } })).toBe(2);
  });

  it("flags a wrong amount and does NOT mark the order paid [AC-PAY-06]", async () => {
    verifyTransaction.mockResolvedValue({
      status: "success",
      amountPesewas: 100,
      currency: "GHS",
      reference,
      channel: "card",
      providerTransactionId: "1",
      gatewayResponse: "Approved",
      paidAt: FRIDAY_NOON,
    });

    const response = await sendWebhook(chargeSuccess());

    expect(response.status).toBe(200);
    expect(response.body.data.outcome).toBe("AMOUNT_MISMATCH");
    expect((await Payment.findOne({ where: { reference } })).status).toBe("AMOUNT_MISMATCH");
    expect((await Order.findByPk(order.id)).status).toBe("PENDING_PAYMENT");
  });

  it("alerts every active admin, live and by email, once [AC-PAY-06, AC-NOTIF-01, AC-NOTIF-04]", async () => {
    await createTestUser({
      role: "ADMIN",
      status: "ACTIVE",
      email: "admin@example.com",
      phone: "+233200000001",
    });
    await createTestUser({
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      email: "boss@example.com",
      phone: "+233200000002",
    });
    await createTestUser({
      role: "ADMIN",
      status: "SUSPENDED",
      email: "gone@example.com",
      phone: "+233200000003",
    });
    verifyTransaction.mockResolvedValue({
      status: "success",
      amountPesewas: 100,
      currency: "GHS",
      reference,
      channel: "card",
      providerTransactionId: "1",
      gatewayResponse: "Approved",
      paidAt: FRIDAY_NOON,
    });

    await sendWebhook(chargeSuccess());
    await sendWebhook(chargeSuccess()); // Paystack retries: no second alert

    expect(emitAdminAlert).toHaveBeenCalledTimes(1);
    expect(emitAdminAlert).toHaveBeenCalledWith(
      "PAYMENT_AMOUNT_MISMATCH",
      expect.objectContaining({ orderId: order.id, receivedPesewas: 100 }),
    );
    const adminEmails = sentEmails.filter((email) => email.subject.includes("mismatch"));
    expect(adminEmails.map((email) => email.to).sort()).toEqual([
      "admin@example.com",
      "boss@example.com",
    ]);
    expect(adminEmails[0].text).toContain("GHS 1.00");
    expect(adminEmails[0].text).toContain("NOT marked paid");
  });

  it("does not trust the webhook's own amount, only Paystack's verify answer", async () => {
    const event = chargeSuccess();
    event.data.amount = 1;

    const response = await sendWebhook(event);

    expect(response.body.data.outcome).toBe("ORDER_PAID");
  });

  it("answers 502 when Paystack cannot be reached, so Paystack sends it again later", async () => {
    verifyTransaction.mockRejectedValue(
      new AppError(502, "PAYMENT_PROVIDER_ERROR", "Payment service is not responding"),
    );

    const response = await sendWebhook(chargeSuccess());

    expect(response.status).toBe(502);
    expect((await Payment.findOne({ where: { reference } })).status).toBe("PENDING");
  });

  it("ignores events that are not about a successful charge", async () => {
    const response = await sendWebhook({ event: "transfer.success", data: {} });

    expect(response.status).toBe(200);
    expect(response.body.data.outcome).toBe("IGNORED");
  });

  it("answers 200 for a reference it does not know", async () => {
    verifyTransaction.mockResolvedValue({ status: "success", amountPesewas: 1, currency: "GHS" });

    const response = await sendWebhook({
      event: "charge.success",
      data: { reference: "SOMEONE-ELSE-123" },
    });

    expect(response.status).toBe(200);
    expect(response.body.data.outcome).toBe("UNKNOWN_REFERENCE");
  });
});
