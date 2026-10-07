import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import sequelize from "../../src/config/database.js";
import { Address, MenuCategory, MenuItem, Order, Payment, Refund } from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { formatGhs } from "../../src/utils/money.js";
import { createTestUser } from "../helpers/users.js";
import { createOwner, createTestRestaurant } from "../helpers/restaurants.js";
import { sentSms } from "../helpers/fakeSms.js";
import { lockOrder } from "../../src/repositories/order.repository.js";
import { reconcilePayment } from "../../src/services/payment/paystackWebhook.service.js";
import { requestRefund } from "../../src/services/refund/requestRefund.service.js";
import {
  processPendingRefunds,
  processRefund,
} from "../../src/services/refund/processRefund.service.js";

vi.mock("../../src/services/payment/paystack.client.js", () => ({
  initializeTransaction: vi.fn(async ({ reference }) => ({
    authorizationUrl: `https://checkout.paystack.com/${reference}`,
    accessCode: "access",
  })),
  verifyTransaction: vi.fn(),
  createRefund: vi.fn(async () => ({ providerRefundId: "1234567", status: "pending" })),
  fetchRefund: vi.fn(async () => ({ status: "pending" })),
}));

const paystack = await import("../../src/services/payment/paystack.client.js");

const FRIDAY_NOON = new Date("2026-10-09T12:00:00Z");
const SYSTEM_ACTOR = { userId: null, role: "SYSTEM" };

let customer;
let order;
let reference;

// Places an order and starts a payment; `paid` decides whether Paystack confirms it
const placeOrder = async ({ paid }) => {
  const cookie = `access_token=${signAccessToken(customer)}`;
  const address = await Address.create({
    userId: customer.id,
    label: "HOME",
    latitude: 6.6745,
    longitude: -1.61,
  });
  const waakye = await MenuItem.findOne();

  const placed = await request(app)
    .post("/api/v1/customer/orders")
    .set("Cookie", cookie)
    .set("Idempotency-Key", `tap-refund-${Date.now()}`)
    .send({
      restaurantId: waakye.restaurantId,
      addressId: address.id,
      items: [{ menuItemId: waakye.id, quantity: 2, optionIds: [], seenUnitPricePesewas: 3000 }],
    });
  order = placed.body.data;

  const started = await request(app)
    .post(`/api/v1/customer/orders/${order.id}/payments`)
    .set("Cookie", cookie)
    .send({});
  reference = started.body.data.reference;

  if (paid) {
    paystack.verifyTransaction.mockResolvedValue({
      status: "success",
      amountPesewas: order.totalPesewas,
      currency: "GHS",
      channel: "mobile_money",
      providerTransactionId: "1",
      gatewayResponse: "Approved",
      paidAt: FRIDAY_NOON,
    });
    await reconcilePayment(reference);
  }
};

// Writes a refund the way a caller must: inside a transaction, with the order locked
const askForRefund = (amountPesewas) => {
  return sequelize.transaction(async (transaction) => {
    const lockedOrder = await lockOrder(order.id, transaction);
    return requestRefund({
      order: lockedOrder,
      amountPesewas,
      reason: "Restaurant could not make it",
      actor: SYSTEM_ACTOR,
      transaction,
    });
  });
};

beforeEach(async () => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(FRIDAY_NOON);

  customer = await createTestUser({ phone: "+233241234567" });
  const owner = await createOwner({
    status: "ACTIVE",
    email: "owner@example.com",
    phone: "+233201112222",
  });
  const restaurant = await createTestRestaurant(owner, { status: "APPROVED" });
  const category = await MenuCategory.create({ restaurantId: restaurant.id, name: "Rice" });
  await MenuItem.create({
    restaurantId: restaurant.id,
    categoryId: category.id,
    name: "Waakye",
    pricePesewas: 3000,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Asking for a refund [AC-CANC-04, AC-CANC-05]", () => {
  it("writes a PENDING refund against the successful payment", async () => {
    await placeOrder({ paid: true });

    const refund = await askForRefund(order.totalPesewas);

    expect(refund.status).toBe("PENDING");
    expect(refund.amountPesewas).toBe(order.totalPesewas);
    const payment = await Payment.findOne({ where: { reference } });
    expect(refund.paymentId).toBe(payment.id);
  });

  it("never lets refunds add up to more than was paid", async () => {
    await placeOrder({ paid: true });
    await askForRefund(order.totalPesewas - 1000);

    const tooMuch = await askForRefund(1001).catch((error) => error);

    expect(tooMuch.code).toBe("REFUND_EXCEEDS_PAID");
    expect(tooMuch.message).toContain(formatGhs(1000));
    await askForRefund(1000);
    expect(await Refund.count()).toBe(2);
  });

  it("refuses an order that was never paid", async () => {
    await placeOrder({ paid: false });

    const error = await askForRefund(100).catch((caught) => caught);

    expect(error.code).toBe("NOTHING_TO_REFUND");
  });
});

describe("Sending refunds to Paystack, step by step", () => {
  it("sends, waits, then marks it processed and the order REFUNDED, telling the customer each time [AC-CANC-07]", async () => {
    await placeOrder({ paid: true });
    const refund = await askForRefund(order.totalPesewas);

    expect(await processRefund(refund.id)).toBe("SENT");
    expect(paystack.createRefund).toHaveBeenCalledWith({
      reference,
      amountPesewas: order.totalPesewas,
      note: "Restaurant could not make it",
    });
    expect(sentSms.at(-1).phone).toBe("+233241234567");
    expect(sentSms.at(-1).message).toContain("has started");
    expect(sentSms.at(-1).message).toContain("1 to 3 working days");

    expect(await processRefund(refund.id)).toBe("STILL_PENDING");
    expect(paystack.createRefund).toHaveBeenCalledTimes(1);

    paystack.fetchRefund.mockResolvedValue({ status: "processed" });
    expect(await processRefund(refund.id)).toBe("PROCESSED");
    expect((await Order.findByPk(order.id)).paymentStatus).toBe("REFUNDED");
    expect(sentSms.at(-1).message).toContain("has been processed");

    expect(await processRefund(refund.id)).toBe("ALREADY_DONE");
  });

  it("marks a partial refund as PARTIALLY_REFUNDED", async () => {
    await placeOrder({ paid: true });
    const refund = await askForRefund(1000);
    await processRefund(refund.id);
    paystack.fetchRefund.mockResolvedValue({ status: "processed" });

    await processRefund(refund.id);

    expect((await Order.findByPk(order.id)).paymentStatus).toBe("PARTIALLY_REFUNDED");
  });

  it("marks a refund Paystack could not complete as FAILED", async () => {
    await placeOrder({ paid: true });
    const refund = await askForRefund(order.totalPesewas);
    await processRefund(refund.id);
    paystack.fetchRefund.mockResolvedValue({ status: "failed" });

    expect(await processRefund(refund.id)).toBe("FAILED");
    expect((await Refund.findByPk(refund.id)).status).toBe("FAILED");
  });

  it("the every-5-minutes sweep moves every pending refund forward", async () => {
    await placeOrder({ paid: true });
    await askForRefund(order.totalPesewas);

    expect(await processPendingRefunds()).toEqual({ checked: 1, outcomes: { SENT: 1 } });
  });
});

describe("Money that arrives after the order was closed", () => {
  it("is refunded in full automatically", async () => {
    await placeOrder({ paid: false });
    await Order.update(
      { status: "CANCELLED", cancellationReason: "PAYMENT_TIMEOUT" },
      { where: { id: order.id } },
    );
    paystack.verifyTransaction.mockResolvedValue({
      status: "success",
      amountPesewas: order.totalPesewas,
      currency: "GHS",
      channel: "card",
      providerTransactionId: "2",
      gatewayResponse: "Approved",
      paidAt: FRIDAY_NOON,
    });

    expect(await reconcilePayment(reference)).toBe("PAID_AFTER_CLOSE");

    const refund = await Refund.findOne({ where: { orderId: order.id } });
    expect(refund.amountPesewas).toBe(order.totalPesewas);
    expect(refund.initiatedByRole).toBe("SYSTEM");
    expect((await Order.findByPk(order.id)).status).toBe("CANCELLED");
  });
});
