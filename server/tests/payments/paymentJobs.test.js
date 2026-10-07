import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import AppError from "../../src/utils/AppError.js";
import {
  Address,
  MenuCategory,
  MenuItem,
  Order,
  OrderStatusHistory,
  Payment,
  RefreshToken,
} from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { createTestUser } from "../helpers/users.js";
import { createOwner, createTestRestaurant } from "../helpers/restaurants.js";
import { scheduledJobs } from "../helpers/fakeJobs.js";
import {
  cleanupExpiredTokens,
  expireUnpaidOrder,
  reconcileStuckPayments,
  sweepUnpaidOrders,
} from "../../src/services/payment/paymentJobs.service.js";

vi.mock("../../src/services/payment/paystack.client.js", () => ({
  initializeTransaction: vi.fn(async ({ reference }) => ({
    authorizationUrl: `https://checkout.paystack.com/${reference}`,
    accessCode: "access",
  })),
  verifyTransaction: vi.fn(),
}));

const { verifyTransaction } = await import("../../src/services/payment/paystack.client.js");

const PLACED_AT = new Date("2026-10-09T12:00:00Z");
const minutesLater = (minutes) => new Date(PLACED_AT.getTime() + minutes * 60 * 1000);

let customer;
let waakye;
let order;

beforeEach(async () => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(PLACED_AT);

  customer = await createTestUser();
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
  const address = await Address.create({
    userId: customer.id,
    label: "HOME",
    latitude: 6.6745,
    longitude: -1.61,
  });

  const placed = await request(app)
    .post("/api/v1/customer/orders")
    .set("Cookie", `access_token=${signAccessToken(customer)}`)
    .set("Idempotency-Key", "tap-jobs-12345")
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

const startPayment = async () => {
  const started = await request(app)
    .post(`/api/v1/customer/orders/${order.id}/payments`)
    .set("Cookie", `access_token=${signAccessToken(customer)}`)
    .send({});
  return started.body.data.reference;
};

const paystackSays = (status, amountPesewas = order.totalPesewas) => {
  verifyTransaction.mockResolvedValue({
    status,
    amountPesewas,
    currency: "GHS",
    channel: "mobile_money",
    providerTransactionId: "1",
    gatewayResponse: status,
    paidAt: status === "success" ? PLACED_AT : null,
  });
};

describe("Unpaid order expiry [AC-PAY-11, AC-JOB-02]", () => {
  it("is scheduled when the order is placed", () => {
    expect(scheduledJobs).toEqual([{ name: "expireUnpaidOrder", orderId: order.id }]);
  });

  it("cancels an order still unpaid after 30 minutes and gives the stock back", async () => {
    expect((await MenuItem.findByPk(waakye.id)).stockRemaining).toBe(8);

    const outcome = await expireUnpaidOrder(order.id, minutesLater(31));

    expect(outcome).toBe("EXPIRED");
    const expired = await Order.findByPk(order.id);
    expect(expired.status).toBe("CANCELLED");
    expect(expired.cancellationReason).toBe("PAYMENT_TIMEOUT");
    expect((await MenuItem.findByPk(waakye.id)).stockRemaining).toBe(10);

    const lastStep = await OrderStatusHistory.findOne({
      where: { orderId: order.id, toStatus: "CANCELLED" },
    });
    expect(lastStep.actorRole).toBe("SYSTEM");
  });

  it("does nothing before 30 minutes", async () => {
    expect(await expireUnpaidOrder(order.id, minutesLater(29))).toBe("NOT_DUE");
    expect((await Order.findByPk(order.id)).status).toBe("PENDING_PAYMENT");
  });

  it("does nothing if the order was paid in the meantime [AC-JOB-03]", async () => {
    await Order.update({ status: "PAID", paymentStatus: "PAID" }, { where: { id: order.id } });

    expect(await expireUnpaidOrder(order.id, minutesLater(31))).toBe("NOT_PENDING");
    expect((await Order.findByPk(order.id)).status).toBe("PAID");
  });

  it("asks Paystack one last time, and marks it PAID if the webhook was lost", async () => {
    const reference = await startPayment();
    paystackSays("success");

    const outcome = await expireUnpaidOrder(order.id, minutesLater(31));

    expect(outcome).toBe("NOT_PENDING");
    expect(verifyTransaction).toHaveBeenCalledWith(reference);
    expect((await Order.findByPk(order.id)).status).toBe("PAID");
  });

  it("still expires when Paystack says the payment was abandoned", async () => {
    const reference = await startPayment();
    paystackSays("abandoned");

    expect(await expireUnpaidOrder(order.id, minutesLater(31))).toBe("EXPIRED");
    expect((await Payment.findOne({ where: { reference } })).status).toBe("ABANDONED");
  });

  it("does not guess when Paystack cannot be reached: the job fails and retries later", async () => {
    await startPayment();
    verifyTransaction.mockRejectedValue(
      new AppError(502, "PAYMENT_PROVIDER_ERROR", "Payment service is not responding"),
    );

    await expect(expireUnpaidOrder(order.id, minutesLater(31))).rejects.toThrow();
    expect((await Order.findByPk(order.id)).status).toBe("PENDING_PAYMENT");
  });
});

describe("Every-minute sweeper (safety net if Redis loses the delayed job)", () => {
  it("expires overdue unpaid orders without any job in Redis", async () => {
    const result = await sweepUnpaidOrders(minutesLater(31));

    expect(result).toEqual({ checked: 1, expired: 1 });
    expect((await Order.findByPk(order.id)).status).toBe("CANCELLED");
  });

  it("leaves orders that are not overdue alone", async () => {
    const result = await sweepUnpaidOrders(minutesLater(10));

    expect(result).toEqual({ checked: 0, expired: 0 });
  });
});

describe("Payment reconciliation [AC-PAY-12]", () => {
  it("marks an order PAID when its webhook never arrived", async () => {
    await startPayment();
    paystackSays("success");

    const result = await reconcileStuckPayments(minutesLater(11));

    expect(result).toEqual({ checked: 1, outcomes: { ORDER_PAID: 1 } });
    expect((await Order.findByPk(order.id)).status).toBe("PAID");
  });

  it("leaves a payment that is still in progress (e.g. MoMo prompt on the phone) as PENDING", async () => {
    const reference = await startPayment();
    paystackSays("ongoing");

    const result = await reconcileStuckPayments(minutesLater(11));

    expect(result.outcomes).toEqual({ STILL_PENDING: 1 });
    expect((await Payment.findOne({ where: { reference } })).status).toBe("PENDING");
  });

  it("does not check payments started less than 10 minutes ago", async () => {
    await startPayment();

    const result = await reconcileStuckPayments(minutesLater(5));

    expect(result.checked).toBe(0);
    expect(verifyTransaction).not.toHaveBeenCalled();
  });
});

describe("Expired login session clean-up [AC-JOB-02]", () => {
  it("deletes only sessions that have expired", async () => {
    const base = { userId: customer.id, familyId: customer.id };
    await RefreshToken.create({ ...base, tokenHash: "a".repeat(64), expiresAt: minutesLater(-60) });
    await RefreshToken.create({ ...base, tokenHash: "b".repeat(64), expiresAt: minutesLater(60) });

    const result = await cleanupExpiredTokens(PLACED_AT);

    expect(result).toEqual({ deleted: 1 });
    expect(await RefreshToken.count()).toBe(1);
  });
});
