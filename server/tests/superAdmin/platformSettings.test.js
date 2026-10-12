import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { Address, AuditLog, MenuCategory, MenuItem, Order } from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { createTestUser } from "../helpers/users.js";
import { createOwner, createTestRestaurant } from "../helpers/restaurants.js";
import { getSettings } from "../../src/services/settings/platformSettings.service.js";

// A Friday: the test restaurant is open
const FRIDAY_NOON = new Date("2026-10-09T12:00:00Z");
const url = "/api/v1/super-admin/settings";

let boss;
let customer;
let checkout;

const as = (user) => ({
  get: (path) =>
    request(app)
      .get(path)
      .set("Cookie", `access_token=${signAccessToken(user)}`),
  post: (path, body, headers = {}) =>
    request(app)
      .post(path)
      .set("Cookie", `access_token=${signAccessToken(user)}`)
      .set(headers)
      .send(body),
  patch: (path, body) =>
    request(app)
      .patch(path)
      .set("Cookie", `access_token=${signAccessToken(user)}`)
      .send(body),
});

const change = (settings, reason = "Fuel prices went up this month") =>
  as(boss).patch(url, { settings, reason });

const quote = () => as(customer).post("/api/v1/customer/checkout/quote", checkout);

const placeOrder = (extra = {}) =>
  as(customer).post(
    "/api/v1/customer/orders",
    { ...checkout, ...extra },
    { "Idempotency-Key": "tap-" + Math.random().toString(36).slice(2, 12) },
  );

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(FRIDAY_NOON);
  boss = await createTestUser({
    role: "SUPER_ADMIN",
    email: "super@example.com",
    phone: "+233200000002",
  });
  customer = await createTestUser({ email: "ama@example.com", phone: "+233241234567" });
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
  checkout = {
    restaurantId: restaurant.id,
    addressId: address.id,
    items: [{ menuItemId: waakye.id, quantity: 2, optionIds: [], seenUnitPricePesewas: 3000 }],
  };
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Platform settings [AC-SADM-02]", () => {
  it("shows the settings in force and the history", async () => {
    await change({ commissionPercent: 12 });

    const response = await as(boss).get(url);

    expect(response.status).toBe(200);
    expect(response.body.data.values).toMatchObject({
      commissionPercent: 12,
      deliveryBasePesewas: 500,
    });
    expect(response.body.data.history[0]).toMatchObject({
      reason: "Fuel prices went up this month",
      changedBy: boss.fullName,
    });
  });

  it("records every change in the audit log with only the old and new values", async () => {
    await change({ deliveryBasePesewas: 700, commissionPercent: 10 });

    const audit = await AuditLog.findOne({ where: { action: "SETTINGS_CHANGED" } });
    // commissionPercent was already 10: not a change
    expect(audit.before).toEqual({ deliveryBasePesewas: 500 });
    expect(audit.after).toMatchObject({ deliveryBasePesewas: 700 });
    expect(audit.reason).toBe("Fuel prices went up this month");
  });

  it("refuses bad values, no reason, nothing changed, and a narrower second search", async () => {
    const negative = await change({ deliveryBasePesewas: -1 });
    const unknown = await change({ freeFood: true });
    const noReason = await as(boss).patch(url, { settings: { commissionPercent: 11 } });
    const same = await change({ commissionPercent: 10 });
    const narrower = await change({ widenedRadiusKm: 3 });

    expect([negative.status, unknown.status, noReason.status]).toEqual([400, 400, 400]);
    expect(same.body.error.code).toBe("NOTHING_CHANGED");
    expect(narrower.status).toBe(400);
  });

  it("is for super admins only", async () => {
    const admin = await createTestUser({
      role: "ADMIN",
      email: "admin@example.com",
      phone: "+233200000001",
    });

    const response = await as(admin).patch(url, {
      settings: { commissionPercent: 50 },
      reason: "I would like more money",
    });

    expect(response.status).toBe(403);
  });
});

describe("Changes apply to new orders only, without a restart [AC-SADM-03, plan-review C14]", () => {
  it("the next quote uses the new fee at once", async () => {
    const before = await quote();
    await change({ deliveryBasePesewas: 1000 });
    const after = await quote();

    expect(after.body.data.deliveryFeePesewas - before.body.data.deliveryFeePesewas).toBe(500);
    expect(after.body.data.pricingSnapshot.settingsVersion).toBe((await getSettings()).version);
    expect(after.body.data).not.toHaveProperty("commissionPercent");
  });

  it("an order already placed keeps its fee and commission", async () => {
    const placed = await placeOrder();
    await change({ deliveryBasePesewas: 1000, commissionPercent: 20 });

    const order = await Order.scope("withEarnings").findByPk(placed.body.data.id);
    expect(order.deliveryFeePesewas).toBe(placed.body.data.deliveryFeePesewas);
    expect(order.commissionPercent).toBe(10);
    const next = await placeOrder();
    const nextOrder = await Order.scope("withEarnings").findByPk(next.body.data.id);
    expect(nextOrder.commissionPercent).toBe(20);
  });

  it("a fee change between the checkout page and Place order stops the order with the new total", async () => {
    const shown = await quote();
    await change({ deliveryBasePesewas: 1000 });

    const response = await placeOrder({ seenTotalPesewas: shown.body.data.totalPesewas });

    expect(response.status).toBe(409);
    expect(response.body.error.details.map((detail) => detail.code)).toContain("TOTAL_CHANGED");
    expect(await Order.count()).toBe(0);
  });
});
