import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { Order, OrderStatusHistory, Payment, Refund } from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { createTestUser } from "../helpers/users.js";
import { createPaidOrder } from "../helpers/orders.js";

// Thursday and Friday noon: the test restaurants are open (closed Sundays)
const THURSDAY = new Date("2026-10-08T12:00:00Z");
const FRIDAY = new Date("2026-10-09T12:00:00Z");

let admin;

const analytics = (user, query) =>
  request(app)
    .get("/api/v1/admin/analytics")
    .query(query)
    .set("Cookie", `access_token=${signAccessToken(user)}`);

// A refund that went through (or not), as Paystack would leave it
const refund = async (order, amountPesewas, status = "PROCESSED") => {
  const payment = await Payment.create({
    orderId: order.id,
    reference: "CH-TEST-" + order.orderNumber,
    amountPesewas: order.totalPesewas,
    status: "SUCCESS",
  });
  await Refund.create({
    orderId: order.id,
    paymentId: payment.id,
    amountPesewas,
    reason: "Test",
    initiatedByRole: "SYSTEM",
    status,
  });
};

// Thursday: one delivered order. Friday: one delivered, one cancelled with a full refund,
// one still in the kitchen, one never paid.
const createWeek = async () => {
  vi.setSystemTime(THURSDAY);
  const thursday = (await createPaidOrder(1)).order;
  await thursday.update({ status: "DELIVERED" });

  vi.setSystemTime(FRIDAY);
  const delivered = (await createPaidOrder(2)).order;
  await delivered.update({ status: "DELIVERED" });
  const cancelled = (await createPaidOrder(3)).order;
  await cancelled.update({ status: "CANCELLED", paymentStatus: "REFUNDED" });
  await refund(cancelled, cancelled.totalPesewas);
  // A refund still waiting at Paystack has not given anything back yet
  const preparing = (await createPaidOrder(4)).order;
  await preparing.update({ status: "PREPARING" });
  await refund(preparing, 500, "FAILED");
  const unpaid = (await createPaidOrder(5)).order;
  await OrderStatusHistory.destroy({ where: { orderId: unpaid.id, toStatus: "PAID" } });
  await unpaid.update({ status: "PENDING_PAYMENT", paymentStatus: "UNPAID" });

  return { thursday, delivered, cancelled, preparing, unpaid };
};

// What CibusHub keeps from one order (commission is hidden by the default scope)
const keptFrom = async (order) => {
  const full = await Order.scope("withEarnings").findByPk(order.id);
  return full.commissionPesewas + full.serviceFeePesewas;
};

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  admin = await createTestUser({
    role: "ADMIN",
    email: "admin@example.com",
    phone: "+233200000001",
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Admin charts [AC-ANL-01]", () => {
  it("counts each order on the day it was paid, with a 0 for days without orders", async () => {
    const { thursday, delivered, cancelled, preparing } = await createWeek();

    const response = await analytics(admin, { from: "2026-10-07", to: "2026-10-09" });

    expect(response.status).toBe(200);
    expect(response.body.data.days).toEqual([
      { day: "2026-10-07", orders: 0, customerPaidPesewas: 0, cibushubPesewas: 0 },
      {
        day: "2026-10-08",
        orders: 1,
        customerPaidPesewas: thursday.totalPesewas,
        cibushubPesewas: await keptFrom(thursday),
      },
      {
        day: "2026-10-09",
        // Paid that day: delivered, cancelled and preparing (not the unpaid one)
        orders: 3,
        // The cancelled order was refunded in full; the failed refund gave nothing back
        customerPaidPesewas: delivered.totalPesewas + preparing.totalPesewas,
        // Only delivered orders earn CibusHub anything
        cibushubPesewas: await keptFrom(delivered),
      },
    ]);
    expect(cancelled.totalPesewas).toBeGreaterThan(0);
  });

  it("counts orders placed in the range by status, unpaid ones too", async () => {
    await createWeek();

    const response = await analytics(admin, { from: "2026-10-09", to: "2026-10-09" });

    expect(response.body.data.ordersByStatus).toMatchObject({
      PENDING_PAYMENT: 1,
      PREPARING: 1,
      DELIVERED: 1,
      CANCELLED: 1,
      PAID: 0,
    });
  });

  it("lists the top restaurants by what customers paid there", async () => {
    const { delivered, preparing } = await createWeek();

    const response = await analytics(admin, { from: "2026-10-09", to: "2026-10-09" });
    const top = response.body.data.topRestaurants;

    // The refunded restaurant is last, with nothing kept
    expect(top).toHaveLength(3);
    expect(
      top
        .map((row) => row.restaurantId)
        .slice(0, 2)
        .sort(),
    ).toEqual([delivered.restaurantId, preparing.restaurantId].sort());
    expect(top[2]).toMatchObject({ orders: 1, customerPaidPesewas: 0 });
  });
});

describe("Totals match the records [AC-ANL-05]", () => {
  it("equals a sum of the orders and refunds for the same days", async () => {
    await createWeek();

    const response = await analytics(admin, { from: "2026-10-08", to: "2026-10-09" });

    // Worked out the long way: every paid order, minus what was really refunded
    const paidIds = (await OrderStatusHistory.findAll({ where: { toStatus: "PAID" } })).map(
      (entry) => entry.orderId,
    );
    const paidOrders = await Order.scope("withEarnings").findAll({ where: { id: paidIds } });
    const refunded = await Refund.sum("amountPesewas", {
      where: { orderId: paidIds, status: "PROCESSED" },
    });
    const kept = paidOrders
      .filter((order) => order.status === "DELIVERED")
      .reduce((sum, order) => sum + order.commissionPesewas + order.serviceFeePesewas, 0);

    expect(response.body.data.totals).toEqual({
      orders: paidOrders.length,
      customerPaidPesewas:
        paidOrders.reduce((sum, order) => sum + order.totalPesewas, 0) - (refunded || 0),
      cibushubPesewas: kept,
    });
  });
});

describe("Date range checks", () => {
  it("refuses a range backwards, too long, or not a date", async () => {
    const backwards = await analytics(admin, { from: "2026-10-09", to: "2026-10-01" });
    const tooLong = await analytics(admin, { from: "2026-01-01", to: "2026-10-09" });
    const notADate = await analytics(admin, { from: "yesterday", to: "2026-10-09" });

    expect([backwards.status, tooLong.status, notADate.status]).toEqual([400, 400, 400]);
    expect(tooLong.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("is for admins only", async () => {
    const customer = await createTestUser({ email: "kofi@example.com", phone: "+233200000002" });

    const response = await analytics(customer, { from: "2026-10-09", to: "2026-10-09" });

    expect(response.status).toBe(403);
  });
});
