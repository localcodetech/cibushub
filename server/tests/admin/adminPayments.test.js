import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { AuditLog, Order, Payment, Refund } from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { createTestUser } from "../helpers/users.js";
import { createPaidOrder } from "../helpers/orders.js";
import { scheduledJobs } from "../helpers/fakeJobs.js";

vi.mock("../../src/services/payment/paystack.client.js", () => ({
  initializeTransaction: vi.fn(),
  verifyTransaction: vi.fn(),
  createRefund: vi.fn(),
  fetchRefund: vi.fn(),
}));
const { verifyTransaction } = await import("../../src/services/payment/paystack.client.js");

// A Friday: the test restaurant is open
const FRIDAY_NOON = new Date("2026-10-09T12:00:00Z");
const MINUTE = 60 * 1000;

let admin;
let order;
let customer;

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

const references = (response) => response.body.data.map((payment) => payment.reference);

beforeEach(async () => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(FRIDAY_NOON);
  admin = await createTestUser({
    role: "ADMIN",
    email: "admin@example.com",
    phone: "+233200000001",
  });
  ({ order, customer } = await createPaidOrder());
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Payments for admins [AC-ADM-06]", () => {
  beforeEach(async () => {
    await Payment.create({
      orderId: order.id,
      reference: "CH-OK-1",
      amountPesewas: order.totalPesewas,
      status: "SUCCESS",
    });
    await Payment.create({
      orderId: order.id,
      reference: "CH-WRONG-1",
      amountPesewas: order.totalPesewas,
      status: "AMOUNT_MISMATCH",
    });
    // Pending for 40 minutes: stuck
    await Payment.create({
      orderId: order.id,
      reference: "CH-STUCK-1",
      amountPesewas: order.totalPesewas,
      status: "PENDING",
      createdAt: new Date(FRIDAY_NOON.getTime() - 40 * MINUTE),
    });
    // Pending for 5 minutes: still normal
    await Payment.create({
      orderId: order.id,
      reference: "CH-FRESH-1",
      amountPesewas: order.totalPesewas,
      status: "PENDING",
    });
  });

  it("lists the flagged ones: wrong amount and stuck pending, not fresh or settled ones", async () => {
    const flagged = await as(admin).get("/api/v1/admin/payments?flagged=true");

    expect(flagged.status).toBe(200);
    expect(references(flagged).sort()).toEqual(["CH-STUCK-1", "CH-WRONG-1"]);
    expect(flagged.body.data[0].order.orderNumber).toBe(order.orderNumber);
  });

  it("filters by status and finds by reference or order number", async () => {
    const pending = await as(admin).get("/api/v1/admin/payments?status=PENDING");
    const byReference = await as(admin).get("/api/v1/admin/payments?q=CH-OK-1");
    const byOrder = await as(admin).get(`/api/v1/admin/payments?q=${order.orderNumber}`);

    expect(references(pending).sort()).toEqual(["CH-FRESH-1", "CH-STUCK-1"]);
    expect(references(byReference)).toEqual(["CH-OK-1"]);
    expect(byOrder.body.meta.totalItems).toBe(4);
  });

  it("re-verifies a stuck payment with Paystack, like the webhook, and audits it", async () => {
    await order.update({ status: "PENDING_PAYMENT", paymentStatus: "UNPAID" });
    const stuck = await Payment.findOne({ where: { reference: "CH-STUCK-1" } });
    verifyTransaction.mockResolvedValue({ status: "abandoned", gatewayResponse: "Abandoned" });

    const response = await as(admin).post(`/api/v1/admin/payments/${stuck.id}/reverify`);

    expect(response.status).toBe(200);
    expect(response.body.data.outcome).toBe("NOT_PAID");
    expect(response.body.data.payment.status).toBe("ABANDONED");
    const audit = await AuditLog.findOne({ where: { action: "PAYMENT_REVERIFIED" } });
    expect(audit).toMatchObject({ actorId: admin.id, targetId: stuck.id });
    expect(audit.after).toMatchObject({ status: "ABANDONED", outcome: "NOT_PAID" });
  });

  it("is for admins only", async () => {
    const response = await as(customer).get("/api/v1/admin/payments");

    expect(response.status).toBe(403);
    expect(await Order.count()).toBe(1);
  });
});

describe("Refunds for admins [AC-ADM-06, AC-ADM-08]", () => {
  let refund;

  beforeEach(async () => {
    const payment = await Payment.create({
      orderId: order.id,
      reference: "CH-OK-1",
      amountPesewas: order.totalPesewas,
      status: "SUCCESS",
    });
    refund = await Refund.create({
      orderId: order.id,
      paymentId: payment.id,
      amountPesewas: 500,
      reason: "Restaurant rejected",
      initiatedByRole: "SYSTEM",
      status: "FAILED",
      providerRefundId: "rf_old",
      failureReason: "Paystack refund failed",
    });
  });

  it("lists failed refunds with their order", async () => {
    const response = await as(admin).get("/api/v1/admin/refunds?status=FAILED");

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      id: refund.id,
      failureReason: "Paystack refund failed",
      order: { orderNumber: order.orderNumber },
    });
  });

  it("tries a failed refund again: back to pending as a new request, queued, audited", async () => {
    const response = await as(admin).post(`/api/v1/admin/refunds/${refund.id}/retry`, {
      reason: "Customer's MoMo wallet is working again",
    });

    expect(response.status).toBe(200);
    const after = await Refund.findByPk(refund.id);
    expect(after).toMatchObject({ status: "PENDING", providerRefundId: null, failureReason: null });
    expect(scheduledJobs).toContainEqual(expect.objectContaining({ refundId: refund.id }));
    const audit = await AuditLog.findOne({ where: { action: "REFUND_RETRIED" } });
    expect(audit.reason).toBe("Customer's MoMo wallet is working again");
  });

  it("needs a reason, and only failed refunds can be retried", async () => {
    const noReason = await as(admin).post(`/api/v1/admin/refunds/${refund.id}/retry`, {});
    await refund.update({ status: "PROCESSED" });
    const notFailed = await as(admin).post(`/api/v1/admin/refunds/${refund.id}/retry`, {
      reason: "Trying it again please",
    });

    expect(noReason.status).toBe(400);
    expect(notFailed.status).toBe(409);
    expect(notFailed.body.error.code).toBe("REFUND_NOT_FAILED");
  });
});
