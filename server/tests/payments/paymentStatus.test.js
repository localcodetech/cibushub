import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import AppError from "../../src/utils/AppError.js";
import { Address, MenuCategory, MenuItem, Order, Payment } from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { createTestUser } from "../helpers/users.js";
import { createOwner, createTestRestaurant } from "../helpers/restaurants.js";

// Pretend Paystack: the test decides what "verify" answers
vi.mock("../../src/services/payment/paystack.client.js", () => ({
  initializeTransaction: vi.fn(async ({ reference }) => ({
    authorizationUrl: `https://checkout.paystack.com/${reference}`,
    accessCode: "access",
  })),
  verifyTransaction: vi.fn(),
}));

const { verifyTransaction } = await import("../../src/services/payment/paystack.client.js");

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
    .set("Idempotency-Key", "tap-status-1")
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
});

afterEach(() => {
  vi.useRealTimers();
});

const askStatus = (user = customer) => {
  return request(app)
    .get(`/api/v1/customer/orders/${order.id}/payment-status`)
    .set("Cookie", `access_token=${signAccessToken(user)}`);
};

const paystackSays = (status, extra = {}) => {
  verifyTransaction.mockResolvedValue({
    status,
    amountPesewas: order.totalPesewas,
    currency: "GHS",
    reference,
    channel: "mobile_money",
    providerTransactionId: "4099260516",
    gatewayResponse: status === "success" ? "Approved" : "Declined",
    paidAt: status === "success" ? FRIDAY_NOON : null,
    ...extra,
  });
};

describe("GET /api/v1/customer/orders/:orderId/payment-status [AC-PAY-09, AC-PAY-10]", () => {
  it("asks Paystack itself and marks the order PAID when Paystack confirms", async () => {
    paystackSays("success");

    const response = await askStatus();

    expect(response.status).toBe(200);
    expect(response.body.data.state).toBe("PAID");
    expect(verifyTransaction).toHaveBeenCalledWith(reference);
    const saved = await Order.findByPk(order.id);
    expect(saved.status).toBe("PAID");
    expect(saved.paymentStatus).toBe("PAID");
  });

  it("does not mark the order paid when the amount is wrong [AC-PAY-06]", async () => {
    paystackSays("success", { amountPesewas: 100 });

    const response = await askStatus();

    expect(response.body.data.state).toBe("PROBLEM");
    expect((await Order.findByPk(order.id)).status).toBe("PENDING_PAYMENT");
  });

  it("says FAILED with Paystack's reason, and the order can be paid again", async () => {
    paystackSays("failed");

    const response = await askStatus();

    expect(response.body.data).toMatchObject({ state: "FAILED", message: "Declined" });
    expect((await Order.findByPk(order.id)).status).toBe("PENDING_PAYMENT");
    const payment = await Payment.findOne({ where: { reference } });
    expect(payment.status).toBe("FAILED");
  });

  it("says NOT_COMPLETED for an abandoned payment but saves nothing, so it can still complete", async () => {
    paystackSays("abandoned");

    const response = await askStatus();

    expect(response.body.data.state).toBe("NOT_COMPLETED");
    const payment = await Payment.findOne({ where: { reference } });
    expect(payment.status).toBe("PENDING");
  });

  it("keeps waiting while Paystack is still processing (e.g. MoMo approval)", async () => {
    paystackSays("ongoing");

    const response = await askStatus();

    expect(response.body.data.state).toBe("PENDING");
  });

  it("keeps waiting when Paystack can't be reached", async () => {
    verifyTransaction.mockRejectedValue(
      new AppError(502, "PAYMENT_PROVIDER_ERROR", "Payment service is not responding"),
    );

    const response = await askStatus();

    expect(response.status).toBe(200);
    expect(response.body.data.state).toBe("PENDING");
  });

  it("answers PAID without asking Paystack again once the order is paid", async () => {
    paystackSays("success");
    await askStatus();
    verifyTransaction.mockClear();

    const response = await askStatus();

    expect(response.body.data.state).toBe("PAID");
    expect(verifyTransaction).not.toHaveBeenCalled();
  });

  it("returns 404 for another customer's order [AC-RBAC-04]", async () => {
    const stranger = await createTestUser({
      email: "stranger@example.com",
      phone: "+233559998888",
    });

    const response = await askStatus(stranger);

    expect(response.status).toBe(404);
    expect(verifyTransaction).not.toHaveBeenCalled();
  });
});
