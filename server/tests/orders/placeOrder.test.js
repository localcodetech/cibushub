import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import {
  Address,
  MenuCategory,
  MenuItem,
  Option,
  OptionGroup,
  Order,
  OrderItem,
  OrderStatusHistory,
} from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { createTestUser } from "../helpers/users.js";
import { createOwner, createTestRestaurant } from "../helpers/restaurants.js";

const FRIDAY_NOON = new Date("2026-10-09T12:00:00Z");
const SUNDAY_NOON = new Date("2026-10-11T12:00:00Z");

let customer;
let restaurant;
let waakye;
let fish;
let homeAddress;

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(FRIDAY_NOON);

  customer = await createTestUser({ phone: "+233241234567" });
  const owner = await createOwner({
    status: "ACTIVE",
    email: "owner@example.com",
    phone: "+233201112222",
  });
  restaurant = await createTestRestaurant(owner, { status: "APPROVED", deliveryRadiusKm: 5 });

  const category = await MenuCategory.create({ restaurantId: restaurant.id, name: "Rice" });
  waakye = await MenuItem.create({
    restaurantId: restaurant.id,
    categoryId: category.id,
    name: "Waakye",
    pricePesewas: 3000,
    dailyStock: 10,
    stockRemaining: 10,
  });
  const extras = await OptionGroup.create({
    menuItemId: waakye.id,
    name: "Extras",
    minSelect: 0,
    maxSelect: 2,
  });
  fish = await Option.create({ optionGroupId: extras.id, name: "Fish", extraPricePesewas: 500 });

  // About 2 km from the restaurant
  homeAddress = await Address.create({
    userId: customer.id,
    label: "HOME",
    latitude: 6.6745,
    longitude: -1.61,
    landmark: "Blue gate",
    deliveryInstructions: "Call on arrival",
  });
});

afterEach(() => {
  vi.useRealTimers();
});

// Two waakye with fish, as the customer saw them: GHS 35.00 each
const checkout = (overrides = {}) => ({
  restaurantId: restaurant.id,
  addressId: homeAddress.id,
  items: [{ menuItemId: waakye.id, quantity: 2, optionIds: [fish.id], seenUnitPricePesewas: 3500 }],
  restaurantNote: "Less pepper",
  ...overrides,
});

const placeOrder = (body, idempotencyKey = "tap-0001-abcd") => {
  const call = request(app)
    .post("/api/v1/customer/orders")
    .set("Cookie", `access_token=${signAccessToken(customer)}`);

  if (idempotencyKey) {
    call.set("Idempotency-Key", idempotencyKey);
  }

  return call.send(body);
};

describe("POST /api/v1/customer/orders", () => {
  it("creates the order with server prices, frozen items and the first history row [AC-CHK-06, AC-CHK-07]", async () => {
    const response = await placeOrder(checkout());
    const order = response.body.data;

    expect(response.status).toBe(201);
    expect(order.status).toBe("PENDING_PAYMENT");
    expect(order.paymentStatus).toBe("UNPAID");
    expect(order.orderNumber).toMatch(/^CH-\d{6}-\d{6}$/);
    expect(order.subtotalPesewas).toBe(7000);
    expect(order.totalPesewas).toBe(7000 + order.deliveryFeePesewas);
    expect(order.items[0]).toMatchObject({
      name: "Waakye",
      basePricePesewas: 3000,
      unitPricePesewas: 3500,
      quantity: 2,
      lineTotalPesewas: 7000,
    });
    expect(order.items[0].options[0]).toMatchObject({
      groupName: "Extras",
      name: "Fish",
      extraPricePesewas: 500,
    });
    expect(order.deliveryLandmark).toBe("Blue gate");
    expect(order.contactPhone).toBe("+233241234567");
    expect(order.restaurantNote).toBe("Less pepper");
    expect(order.riderNote).toBe("Call on arrival");
    expect(order.statusHistory).toHaveLength(1);
    expect(order.statusHistory[0]).toMatchObject({
      fromStatus: null,
      toStatus: "PENDING_PAYMENT",
      actorRole: "CUSTOMER",
    });
  });

  it("freezes the restaurant, rider and CibusHub shares, and hides them from the customer", async () => {
    const response = await placeOrder(checkout());
    const order = response.body.data;
    const saved = await Order.scope("withEarnings").findByPk(order.id);

    expect(saved.commissionPercent).toBe(10);
    expect(saved.commissionPesewas).toBe(700);
    expect(saved.restaurantEarningsPesewas).toBe(6300);
    expect(saved.riderEarningsPesewas).toBe(order.deliveryFeePesewas);
    expect(order).not.toHaveProperty("commissionPesewas");
    expect(order).not.toHaveProperty("restaurantEarningsPesewas");
    expect(order).not.toHaveProperty("riderEarningsPesewas");
  });

  it("takes the stock [AC-MENU-07]", async () => {
    await placeOrder(checkout());

    expect((await MenuItem.findByPk(waakye.id)).stockRemaining).toBe(8);
  });

  it("charges the server's price, never a tampered one [AC-CHK-02]", async () => {
    const tampered = await placeOrder(
      checkout({
        items: [
          { menuItemId: waakye.id, quantity: 2, optionIds: [fish.id], seenUnitPricePesewas: 1 },
        ],
      }),
    );

    expect(tampered.status).toBe(409);
    expect(tampered.body.error.code).toBe("CHECKOUT_BLOCKED");
    expect(tampered.body.error.details.map((found) => found.code)).toContain("PRICE_CHANGED");
    expect(await Order.count()).toBe(0);

    const withTotal = await placeOrder({ ...checkout(), totalPesewas: 1 }, "tap-0002-abcd");
    expect(withTotal.status).toBe(400);
    expect(await Order.count()).toBe(0);
  });

  it("creates exactly one order when the same tap is sent twice [AC-CHK-09]", async () => {
    const first = await placeOrder(checkout(), "tap-same-1234");
    const second = await placeOrder(checkout(), "tap-same-1234");

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.data.id).toBe(first.body.data.id);
    expect(await Order.count()).toBe(1);
    expect((await MenuItem.findByPk(waakye.id)).stockRemaining).toBe(8);
  });

  it("creates exactly one order when the same tap arrives at the same moment [AC-CHK-09]", async () => {
    const [first, second] = await Promise.all([
      placeOrder(checkout(), "tap-race-1234"),
      placeOrder(checkout(), "tap-race-1234"),
    ]);

    expect(first.body.data.id).toBe(second.body.data.id);
    expect(await Order.count()).toBe(1);
    expect((await MenuItem.findByPk(waakye.id)).stockRemaining).toBe(8);
  });

  it("creates two orders for two different taps", async () => {
    await placeOrder(checkout(), "tap-one-12345");
    await placeOrder(checkout(), "tap-two-12345");

    expect(await Order.count()).toBe(2);
  });

  it("needs an Idempotency-Key header", async () => {
    const response = await placeOrder(checkout(), null);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("writes nothing when the restaurant is closed [AC-CHK-05]", async () => {
    vi.setSystemTime(SUNDAY_NOON);

    const response = await placeOrder(checkout());

    expect(response.status).toBe(409);
    expect(response.body.error.details.map((found) => found.code)).toContain("RESTAURANT_CLOSED");
    expect(await Order.count()).toBe(0);
    expect(await OrderStatusHistory.count()).toBe(0);
    expect((await MenuItem.findByPk(waakye.id)).stockRemaining).toBe(10);
  });

  it("writes nothing when two lines of the same dish need more than is left [AC-CHK-05, AC-CHK-06]", async () => {
    await waakye.update({ stockRemaining: 3 });

    const response = await placeOrder(
      checkout({
        items: [
          { menuItemId: waakye.id, quantity: 2, optionIds: [fish.id], seenUnitPricePesewas: 3500 },
          { menuItemId: waakye.id, quantity: 2, optionIds: [], seenUnitPricePesewas: 3000 },
        ],
      }),
    );

    expect(response.status).toBe(409);
    expect(response.body.error.details[0].code).toBe("NOT_ENOUGH_STOCK");
    expect(await Order.count()).toBe(0);
    expect(await OrderItem.count()).toBe(0);
    expect((await MenuItem.findByPk(waakye.id)).stockRemaining).toBe(3);
  });

  it("keeps the order's copy when the menu changes or the dish is deleted [AC-CHK-07, AC-MENU-09]", async () => {
    const placed = await placeOrder(checkout());

    await waakye.update({ name: "Waakye Deluxe", pricePesewas: 9000 });
    await waakye.destroy();

    const saved = await OrderItem.findOne({ where: { orderId: placed.body.data.id } });
    expect(saved.name).toBe("Waakye");
    expect(saved.unitPricePesewas).toBe(3500);
  });
});
