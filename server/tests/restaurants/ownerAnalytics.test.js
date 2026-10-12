import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { Order, Review } from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { createTestUser } from "../helpers/users.js";
import { createPaidOrder } from "../helpers/orders.js";

// A Friday: the test restaurants are open
const FRIDAY = new Date("2026-10-09T12:00:00Z");

const analytics = (user, query) =>
  request(app)
    .get("/api/v1/owner/analytics")
    .query(query)
    .set("Cookie", `access_token=${signAccessToken(user)}`);

const fridayOnly = (restaurant) => ({
  restaurantId: restaurant.id,
  from: "2026-10-09",
  to: "2026-10-09",
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(FRIDAY);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Restaurant analytics [AC-ANL-03]", () => {
  it("shows the owner their orders, earnings, best sellers and ratings", async () => {
    const { order, owner, restaurant, customer } = await createPaidOrder(1);
    await order.update({ status: "DELIVERED" });
    await Review.create({
      orderId: order.id,
      customerId: customer.id,
      restaurantId: restaurant.id,
      rating: 4,
    });
    const earnings = (await Order.scope("withEarnings").findByPk(order.id))
      .restaurantEarningsPesewas;

    const response = await analytics(owner, fridayOnly(restaurant));

    expect(response.status).toBe(200);
    expect(response.body.data.totals).toEqual({
      orders: 1,
      earningsPesewas: earnings,
      reviews: 1,
      averageRating: 4,
    });
    expect(response.body.data.days).toEqual([
      { day: "2026-10-09", orders: 1, earningsPesewas: earnings, reviews: 1, averageRating: 4 },
    ]);
    // The helper's order is 2 x Waakye at GHS 30
    expect(response.body.data.bestSellers).toEqual([
      { menuItemId: expect.any(String), name: "Waakye", quantity: 2, salesPesewas: 6000 },
    ]);
  });

  it("leaves out hidden reviews, earnings not yet delivered, and dishes from cancelled orders", async () => {
    const { order, owner, restaurant, customer } = await createPaidOrder(1);
    await order.update({ status: "CANCELLED" });
    await Review.create({
      orderId: order.id,
      customerId: customer.id,
      restaurantId: restaurant.id,
      rating: 1,
      hiddenAt: new Date(),
      hiddenReason: "Abusive",
    });

    const response = await analytics(owner, fridayOnly(restaurant));

    expect(response.body.data.totals).toEqual({
      orders: 1,
      earningsPesewas: 0,
      reviews: 0,
      averageRating: null,
    });
    expect(response.body.data.bestSellers).toEqual([]);
  });

  it("never shows another owner's restaurant", async () => {
    const mine = await createPaidOrder(1);
    const theirs = await createPaidOrder(2);

    const response = await analytics(mine.owner, fridayOnly(theirs.restaurant));

    expect(response.status).toBe(404);
    expect(response.body.data).toBeUndefined();
  });

  it("is for restaurant owners only, with a valid range", async () => {
    const { owner, restaurant } = await createPaidOrder(1);
    const customer = await createTestUser({ email: "kofi@example.com", phone: "+233200000002" });

    const asCustomer = await analytics(customer, fridayOnly(restaurant));
    const backwards = await analytics(owner, {
      restaurantId: restaurant.id,
      from: "2026-10-09",
      to: "2026-10-01",
    });

    expect(asCustomer.status).toBe(403);
    expect(backwards.status).toBe(400);
  });
});
