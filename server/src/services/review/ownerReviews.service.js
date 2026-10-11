import AppError from "../../utils/AppError.js";
import { buildPageMeta, toLimitAndOffset } from "../../utils/pagination.js";
import { findRestaurantsByOwner } from "../../repositories/restaurant.repository.js";
import {
  findReviewById,
  findReviewsForRestaurants,
  saveReplyIfNone,
} from "../../repositories/review.repository.js";
import { notifyInApp } from "../notifications/inApp.service.js";
import { shortName } from "./restaurantReviews.service.js";

// What the owner sees: the public review, which restaurant, and their reply
const toOwnerReview = (review) => ({
  id: review.id,
  restaurant: { id: review.restaurant.id, name: review.restaurant.name },
  customerName: shortName(review.customer?.fullName),
  rating: review.rating,
  comment: review.comment,
  createdAt: review.createdAt,
  ownerReply: review.ownerReply,
  ownerRepliedAt: review.ownerRepliedAt,
});

// Reviews of all my restaurants, newest first; ?unanswered=true for the ones waiting for a reply
export const listOwnerReviews = async (ownerId, query) => {
  const restaurants = await findRestaurantsByOwner(ownerId);
  const { limit, offset } = toLimitAndOffset(query);

  const { rows, count } = await findReviewsForRestaurants({
    restaurantIds: restaurants.map((restaurant) => restaurant.id),
    unansweredOnly: query.unanswered === true,
    limit,
    offset,
  });

  return { reviews: rows.map(toOwnerReview), meta: buildPageMeta(query, count) };
};

// One public reply per review [AC-REV-06]. Someone else's review looks like none.
// The customer hears about it in the app.
export const replyToReview = async (ownerId, reviewId, reply, now = new Date()) => {
  const review = await findReviewById(reviewId);
  if (!review || review.restaurant.ownerId !== ownerId) {
    throw new AppError(404, "NOT_FOUND", "Review not found");
  }
  if (review.ownerReply) {
    throw new AppError(409, "ALREADY_REPLIED", "You have already replied to this review");
  }

  // Only if still unanswered at the moment of saving: two taps can't save two replies
  const saved = await saveReplyIfNone(review.id, reply, now);
  if (!saved) {
    throw new AppError(409, "ALREADY_REPLIED", "You have already replied to this review");
  }
  await review.reload();

  await notifyInApp({
    userId: review.customerId,
    type: "review.replied",
    title: `${review.restaurant.name} replied to your review`,
    body: reply.length > 120 ? `${reply.slice(0, 117)}...` : reply,
    link: `/restaurants/${review.restaurant.id}#reviews`,
    key: `review:${review.id}:reply:in-app`,
  });

  return review;
};
