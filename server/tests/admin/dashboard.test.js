import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { Delivery, NotificationLog, Order, Payment, Refund } from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { createTestUser } from "../helpers/users.js";
import { createPaidOrder } from "../helpers/orders.js";
import { createOwner, createTestRestaurant } from "../helpers/restaurants.js";

// A Friday: the test restaurant is open
const NOON = new Date("2026-10-09T12:00:00Z");
const MINUTE = 60 * 1000;

let admin;

const dashboard = (user) =>
  request(app)
    .get("/api/v1/admin/dashboard")
    .set("Cookie", `access_token=${signAccessToken(user)}`);

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOON);
  admin = await createTestUser({
    role: "ADMIN",
    email: "admin@example.com",
    phone: "+233200000001",
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Admin dashboard [AC-ADM-01]", () => {
  it("counts today's paid orders and their total, and the active ones by status", async () => {
    const first = await createPaidOrder(1);
    const second = await createPaidOrder(2);
    await second.order.update({ status: "ACCEPTED" });
    // Paid yesterday: not in today's numbers, but still active
    vi.setSystemTime(new Date(NOON.getTime() - 24 * 60 * MINUTE));
    await createPaidOrder(3);
    vi.setSystemTime(NOON);

    const response = await dashboard(admin);

    expect(response.status).toBe(200);
    expect(response.body.data.today).toMatchObject({
      from: "2026-10-09T00:00:00.000Z",
      paidOrders: 2,
      gmvPesewas: first.order.totalPesewas + second.order.totalPesewas,
    });
    expect(response.body.data.activeOrders).toMatchObject({ PAID: 2, ACCEPTED: 1, PICKED_UP: 0 });
  });

  it("shows pending approvals and the alerts that need someone", async () => {
    const owner = await createOwner({ email: "new.owner@example.com", phone: "+233201119999" });
    await createTestRestaurant(owner, { status: "PENDING_APPROVAL" });
    const { order } = await createPaidOrder(1);
    // Searching for a rider for 12 minutes
    await Delivery.create({
      orderId: order.id,
      status: "SEARCHING",
      searchRadiusKm: 5,
      searchStartedAt: new Date(NOON.getTime() - 12 * MINUTE),
    });
    const payment = await Payment.create({
      orderId: order.id,
      reference: "CH-MISMATCH-1",
      amountPesewas: order.totalPesewas,
      status: "AMOUNT_MISMATCH",
    });
    await Refund.create({
      orderId: order.id,
      paymentId: payment.id,
      amountPesewas: 100,
      reason: "Test",
      initiatedByRole: "SYSTEM",
      status: "FAILED",
    });
    await NotificationLog.create({
      channel: "SMS",
      template: "order.accepted",
      recipientMasked: "+233***4567",
      status: "FAILED",
    });

    const response = await dashboard(admin);

    expect(response.body.data.pendingApprovals.restaurants).toBe(1);
    expect(response.body.data.alerts).toMatchObject({
      ordersWithoutRider: 1,
      amountMismatches: 1,
      failedRefunds: 1,
      failedMessages: 1,
    });
  });

  it("is for admins only", async () => {
    const customer = await createTestUser({ email: "ama@example.com", phone: "+233241234567" });

    const response = await dashboard(customer);

    expect(response.status).toBe(403);
    expect(await Order.count()).toBe(0);
  });
});
