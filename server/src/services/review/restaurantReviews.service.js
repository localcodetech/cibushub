import AppError from "../../utils/AppError.js";
import { buildPageMeta, toLimitAndOffset } from "../../utils/pagination.js";
import { findRestaurantById } from "../../repositories/restaurant.repository.js";
import { findRestaurantReviews } from "../../repositories/review.repository.js";

// "Ama Owusu" -> "Ama O.", "Kofi" -> "Kofi": never a customer's full name in public [AC-REV-05]
export const shortName = (fullName) => {
  const words = String(fullName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) {
    return "A customer";
  }
  if (words.length === 1) {
    return words[0];
  }
  return `${words[0]} ${words[words.length - 1][0].toUpperCase()}.`;
};

// What anyone may see of a review: no order, customer or rider ids
const toPublicReview = (review) => ({
  id: review.id,
  customerName: shortName(review.customer?.fullName),
  rating: review.rating,
  // Plain text: the app shows it as text, never as HTML [AC-REV-08]
  comment: review.comment,
  createdAt: review.createdAt,
  // The restaurant's answer, if any [AC-REV-06]
  ownerReply: review.ownerReply ? { text: review.ownerReply, at: review.ownerRepliedAt } : null,
});

// An approved restaurant's reviews, newest first, 20 a page [AC-REV-05]
export const listRestaurantReviews = async (restaurantId, query) => {
  const restaurant = await findRestaurantById(restaurantId);
  if (!restaurant || restaurant.status !== "APPROVED") {
    throw new AppError(404, "NOT_FOUND", "Restaurant not found");
  }

  const { limit, offset } = toLimitAndOffset(query);
  const { rows, count } = await findRestaurantReviews({ restaurantId, limit, offset });

  return { reviews: rows.map(toPublicReview), meta: buildPageMeta(query, count) };
};
