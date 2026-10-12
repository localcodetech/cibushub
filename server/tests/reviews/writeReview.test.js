import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import {
  AuditLog,
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

    expect(before.body.data).toEqual({
      review: null,
      canWrite: true,
      canEdit: false,
      canRateRider: true,
    });
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

describe("Showing reviews [AC-REV-05, AC-REV-08]", () => {
  it("lists them newest first with first name and last initial, never ids or the full name", async () => {
    await deliver(order);
    await as(customer).post(reviewUrl(), { rating: 4, comment: "<b>Lovely</b> waakye" });
    const second = await createPaidOrder(2);
    await second.order.update({ restaurantId: restaurant.id });
    await deliver(second.order);
    setNow(new Date(Date.now() + 60 * 1000));
    await as(second.customer).post(`/api/v1/customer/orders/${second.order.id}/review`, {
      rating: 2,
    });

    const response = await request(app).get(`/api/v1/restaurants/${restaurant.id}/reviews`);

    expect(response.status).toBe(200);
    expect(response.body.data.map((review) => review.rating)).toEqual([2, 4]);
    expect(response.body.data[1]).toEqual({
      id: expect.any(String),
      customerName: "Ama O.",
      rating: 4,
      comment: "<b>Lovely</b> waakye",
      createdAt: expect.any(String),
      ownerReply: null,
    });
    expect(response.body.meta.totalItems).toBe(2);
  });

  it("the restaurant card shows the average and the count", async () => {
    await deliver(order);
    await as(customer).post(reviewUrl(), { rating: 4 });

    const page = await request(app).get(`/api/v1/restaurants/${restaurant.id}`);
    const list = await request(app).get("/api/v1/restaurants");

    expect(page.body.data).toMatchObject({ averageRating: 4, reviewCount: 1 });
    expect(list.body.data[0]).toMatchObject({ averageRating: 4, reviewCount: 1 });
  });
});

describe("Short names", () => {
  it("keeps the first name and the last initial", async () => {
    const { shortName } = await import("../../src/services/review/restaurantReviews.service.js");

    expect(shortName("Ama Serwaa Owusu")).toBe("Ama O.");
    expect(shortName("Kofi")).toBe("Kofi");
    expect(shortName("  ")).toBe("A customer");
  });
});

describe("The owner's reply [AC-REV-06]", () => {
  let owner;
  let review;

  const ownerAs = () => as(owner);

  beforeEach(async () => {
    await deliver(order);
    const written = await as(customer).post(reviewUrl(), { rating: 2, comment: "Cold food" });
    review = written.body.data;
    owner = await (await import("../../src/models/index.js")).User.findByPk(restaurant.ownerId);
  });

  it("lists my restaurants' reviews, and only the unanswered ones when asked", async () => {
    const all = await ownerAs().get("/api/v1/owner/reviews");
    const unanswered = await ownerAs().get("/api/v1/owner/reviews?unanswered=true");

    expect(all.status).toBe(200);
    expect(all.body.data[0]).toMatchObject({
      id: review.id,
      customerName: "Ama O.",
      rating: 2,
      comment: "Cold food",
      ownerReply: null,
      restaurant: { id: restaurant.id },
    });
    expect(unanswered.body.meta.totalItems).toBe(1);
  });

  it("posts one public reply, shown under the review, and tells the customer", async () => {
    const response = await ownerAs().post(`/api/v1/owner/reviews/${review.id}/reply`, {
      reply: "Sorry! We've fixed our warmers.",
    });
    const again = await ownerAs().post(`/api/v1/owner/reviews/${review.id}/reply`, {
      reply: "Second reply",
    });
    const publicList = await request(app).get(`/api/v1/restaurants/${restaurant.id}/reviews`);
    const unanswered = await ownerAs().get("/api/v1/owner/reviews?unanswered=true");

    expect(response.status).toBe(200);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("ALREADY_REPLIED");
    expect(publicList.body.data[0].ownerReply).toEqual({
      text: "Sorry! We've fixed our warmers.",
      at: expect.any(String),
    });
    expect(unanswered.body.meta.totalItems).toBe(0);
    const { Notification } = await import("../../src/models/index.js");
    const notice = await Notification.findOne({
      where: { userId: customer.id, type: "review.replied" },
    });
    expect(notice.body).toBe("Sorry! We've fixed our warmers.");
  });

  it("another owner can't see or answer it", async () => {
    const other = await createPaidOrder(3);

    const list = await as(other.owner).get("/api/v1/owner/reviews");
    const reply = await as(other.owner).post(`/api/v1/owner/reviews/${review.id}/reply`, {
      reply: "Not mine",
    });

    expect(list.body.data).toEqual([]);
    expect(reply.status).toBe(404);
  });

  it("needs some words", async () => {
    const response = await ownerAs().post(`/api/v1/owner/reviews/${review.id}/reply`, {
      reply: " ",
    });

    expect(response.status).toBe(400);
  });
});

describe("Admins hide abusive reviews [AC-REV-07, AC-ADM-07]", () => {
  let admin;
  let review;

  beforeEach(async () => {
    await deliver(order);
    const written = await as(customer).post(reviewUrl(), {
      rating: 1,
      riderRating: 2,
      comment: "Abusive words here",
    });
    review = written.body.data;
    admin = await createTestUser({
      role: "ADMIN",
      email: "admin@example.com",
      phone: "+233200000001",
    });
  });

  const hide = (reason = "Insults the staff") =>
    as(admin).post(`/api/v1/admin/reviews/${review.id}/hide`, { reason });

  it("hides it with a reason: gone from the lists and the averages, and audited", async () => {
    const response = await hide();

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      hiddenReason: "Insults the staff",
      hiddenBy: admin.id,
    });
    const publicList = await request(app).get(`/api/v1/restaurants/${restaurant.id}/reviews`);
    expect(publicList.body.data).toEqual([]);
    const restaurantAfter = await Restaurant.findByPk(restaurant.id);
    expect([restaurantAfter.ratingTotal, restaurantAfter.reviewCount]).toEqual([0, 0]);
    const riderAfter = await RiderProfile.findByPk(riderProfile.id);
    expect([riderAfter.ratingTotal, riderAfter.ratingCount]).toEqual([0, 0]);
    const audit = await AuditLog.findOne({ where: { targetId: review.id } });
    expect(audit).toMatchObject({
      action: "REVIEW_HIDDEN",
      actorId: admin.id,
      reason: "Insults the staff",
    });
  });

  it("can't be hidden twice, and the customer can't change it any more", async () => {
    await hide();

    const again = await hide();
    const edit = await as(customer).patch(reviewUrl(), { rating: 5 });
    const mine = await as(customer).get(reviewUrl());

    expect(again.body.error.code).toBe("REVIEW_ALREADY_HIDDEN");
    expect(edit.status).toBe(409);
    expect(edit.body.error.code).toBe("REVIEW_HIDDEN");
    expect(mine.body.data.canEdit).toBe(false);
  });

  it("shows it again (with a reason): back in the list and the averages", async () => {
    await hide();

    const response = await as(admin).post(`/api/v1/admin/reviews/${review.id}/show`, {
      reason: "Hidden by mistake",
    });

    expect(response.status).toBe(200);
    const restaurantAfter = await Restaurant.findByPk(restaurant.id);
    expect([restaurantAfter.ratingTotal, restaurantAfter.reviewCount]).toEqual([1, 1]);
    const publicList = await request(app).get(`/api/v1/restaurants/${restaurant.id}/reviews`);
    expect(publicList.body.data).toHaveLength(1);
    // Both written in the same second, so compared without relying on their order
    const audits = await AuditLog.findAll({ where: { targetId: review.id } });
    expect(audits.map((audit) => [audit.action, audit.reason]).sort()).toEqual([
      ["REVIEW_HIDDEN", "Insults the staff"],
      ["REVIEW_SHOWN", "Hidden by mistake"],
    ]);
  });

  it("lists hidden ones for admins, needs a reason, and is admins only", async () => {
    await hide();

    const hiddenList = await as(admin).get("/api/v1/admin/reviews?hidden=true");
    const noReason = await as(admin).post(`/api/v1/admin/reviews/${review.id}/show`, {});
    const asCustomer = await as(customer).post(`/api/v1/admin/reviews/${review.id}/show`, {
      reason: "Please show it",
    });

    expect(hiddenList.body.data).toHaveLength(1);
    expect(hiddenList.body.data[0].restaurant.id).toBe(restaurant.id);
    expect(noReason.status).toBe(400);
    expect(asCustomer.status).toBe(403);
  });
});
