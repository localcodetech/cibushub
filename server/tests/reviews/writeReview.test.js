import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import {
  Delivery,
  OrderStatusHistory,
  Restaurant,
  Review,
  RiderProfile,
} from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { createTestUser } from "../helpers/users.js";
import { createPaidOrder } from "../helpers/orders.js";

const DELIVERED_AT = new Date("2026-10-10T12:00:00Z");
const HOUR = 60 * 60 * 1000;

let order;
let customer;
let restaurant;
let riderProfile;

const as = (user) => ({
  get: (path) =>
    request(app)
      .get(path)
      .set("Cookie", `access_token=${signAccessToken(user)}`),
  post: (path, body) =>
    request(app)
      .post(path)
      .set("Cookie", `access_token=${signAccessToken(user)}`)
      .send(body),
  patch: (path, body) =>
    request(app)
      .patch(path)
      .set("Cookie", `access_token=${signAccessToken(user)}`)
      .send(body),
});

const reviewUrl = () => `/api/v1/customer/orders/${order.id}/review`;

// The clock, as seen by the server
const setNow = (date) => vi.setSystemTime(date);

// Makes a paid order DELIVERED at DELIVERED_AT by a rider
const deliver = async (target) => {
  await target.update({ status: "DELIVERED" });
  await OrderStatusHistory.create({
    orderId: target.id,
    fromStatus: "PICKED_UP",
    toStatus: "DELIVERED",
    actorRole: "RIDER",
    createdAt: DELIVERED_AT,
  });
  await Delivery.create({
    orderId: target.id,
    riderProfileId: riderProfile.id,
    status: "DELIVERED",
    searchRadiusKm: 5,
    searchStartedAt: DELIVERED_AT,
    deliveredAt: DELIVERED_AT,
  });
};

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  setNow(new Date(DELIVERED_AT.getTime() - HOUR));
  ({ order, customer, restaurant } = await createPaidOrder());
  const riderUser = await createTestUser({
    role: "RIDER",
    email: "yaw@example.com",
    phone: "+233241110000",
  });
  riderProfile = await RiderProfile.create({
    userId: riderUser.id,
    vehicleType: "MOTORBIKE",
    plateNumber: "M-21-GR 1234",
    ghanaCardNumber: "GHA-123456789-0",
    status: "APPROVED",
  });
  setNow(new Date(DELIVERED_AT.getTime() + HOUR));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Who can review [AC-REV-01]", () => {
  it("not before the order is delivered", async () => {
    const response = await as(customer).post(reviewUrl(), { rating: 5 });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("REVIEW_NOT_ALLOWED");
  });

  it("only the customer who placed it (anyone else: not found)", async () => {
    await deliver(order);
    const stranger = await createTestUser({ email: "kofi@example.com", phone: "+233551112222" });

    const response = await as(stranger).post(reviewUrl(), { rating: 1 });

    expect(response.status).toBe(404);
    expect(await Review.count()).toBe(0);
  });

  it("once per order, even with two taps at the same moment", async () => {
    await deliver(order);

    const results = await Promise.all([
      as(customer).post(reviewUrl(), { rating: 5 }),
      as(customer).post(reviewUrl(), { rating: 5 }),
    ]);
    const again = await as(customer).post(reviewUrl(), { rating: 4 });

    expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
    expect(again.body.error.code).toBe("ALREADY_REVIEWED");
    expect(await Review.count()).toBe(1);
    expect((await Restaurant.findByPk(restaurant.id)).reviewCount).toBe(1);
  });
});

describe("What a review holds [AC-REV-02, AC-REV-08]", () => {
  beforeEach(async () => {
    await deliver(order);
  });

  it("restaurant stars (required), rider stars and a comment (optional)", async () => {
    const response = await as(customer).post(reviewUrl(), {
      rating: 4,
      riderRating: 5,
      comment: "  Hot and tasty, rider was quick!  ",
    });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      rating: 4,
      riderRating: 5,
      comment: "Hot and tasty, rider was quick!",
      riderProfileId: riderProfile.id,
    });
  });

  it("refuses missing or out-of-range stars and long comments", async () => {
    const noStars = await as(customer).post(reviewUrl(), { comment: "Nice" });
    const sixStars = await as(customer).post(reviewUrl(), { rating: 6 });
    const halfStar = await as(customer).post(reviewUrl(), { rating: 3.5 });
    const tooLong = await as(customer).post(reviewUrl(), { rating: 4, comment: "a".repeat(501) });

    for (const response of [noStars, sixStars, halfStar, tooLong]) {
      expect(response.status).toBe(400);
    }
    expect(await Review.count()).toBe(0);
  });

  it("keeps HTML exactly as typed, as text (the app never runs it)", async () => {
    const comment = '<script>alert("hi")</script> <b>bold</b>';

    const response = await as(customer).post(reviewUrl(), { rating: 3, comment });

    expect(response.body.data.comment).toBe(comment);
  });
});

describe("Review window [AC-REV-03]", () => {
  beforeEach(async () => {
    await deliver(order);
  });

  it("can be written up to 7 days after delivery, not after", async () => {
    setNow(new Date(DELIVERED_AT.getTime() + 7 * 24 * HOUR + 1000));

    const late = await as(customer).post(reviewUrl(), { rating: 5 });

    expect(late.status).toBe(409);
    expect(late.body.error.code).toBe("REVIEW_WINDOW_CLOSED");
  });

  it("can be changed within 24 hours of writing it, not after", async () => {
    await as(customer).post(reviewUrl(), { rating: 5 });

    setNow(new Date(Date.now() + 23 * HOUR));
    const changed = await as(customer).patch(reviewUrl(), { rating: 4, comment: "Good" });
    setNow(new Date(Date.now() + 2 * HOUR));
    const tooLate = await as(customer).patch(reviewUrl(), { rating: 1 });

    expect(changed.status).toBe(200);
    expect(changed.body.data).toMatchObject({ rating: 4, comment: "Good" });
    expect(tooLate.status).toBe(409);
    expect(tooLate.body.error.code).toBe("REVIEW_EDIT_WINDOW_CLOSED");
  });

  it("tells the app what I can still do", async () => {
    const before = await as(customer).get(reviewUrl());
    await as(customer).post(reviewUrl(), { rating: 5 });
    const after = await as(customer).get(reviewUrl());

    expect(before.body.data).toEqual({ review: null, canWrite: true, canEdit: false });
    expect(after.body.data).toMatchObject({ canWrite: false, canEdit: true });
    expect(after.body.data.review.rating).toBe(5);
  });
});

describe("Running totals [AC-REV-04]", () => {
  it("restaurant and rider totals follow every review and every change", async () => {
    await deliver(order);
    const second = await createPaidOrder(2);
    // Same restaurant for the second order: move it there
    await second.order.update({ restaurantId: restaurant.id, customerId: customer.id });
    await deliver(second.order);

    await as(customer).post(reviewUrl(), { rating: 5, riderRating: 4 });
    await as(customer).post(`/api/v1/customer/orders/${second.order.id}/review`, { rating: 2 });
    // Change the first: 5 -> 3 stars, and take back the rider's stars
    await as(customer).patch(reviewUrl(), { rating: 3, riderRating: null });

    const restaurantAfter = await Restaurant.findByPk(restaurant.id);
    const riderAfter = await RiderProfile.findByPk(riderProfile.id);
    // They must match the reviews themselves
    const reviews = await Review.findAll({ where: { restaurantId: restaurant.id } });
    expect(restaurantAfter.reviewCount).toBe(reviews.length);
    expect(restaurantAfter.ratingTotal).toBe(
      reviews.reduce((sum, review) => sum + review.rating, 0),
    );
    expect(restaurantAfter.ratingTotal).toBe(5);
    expect(riderAfter.ratingCount).toBe(0);
    expect(riderAfter.ratingTotal).toBe(0);
  });
});
