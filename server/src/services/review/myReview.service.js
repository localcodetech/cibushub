import sequelize from "../../config/database.js";
import AppError from "../../utils/AppError.js";
import { retryOnDeadlock } from "../../utils/database/retryOnDeadlock.js";
import { REVIEW_RULES } from "../../utils/review/reviewRules.js";
import { findDeliveredAt, findOrderById } from "../../repositories/order.repository.js";
import { findDeliveryByOrderId } from "../../repositories/delivery.repository.js";
import {
  addToRestaurantRating,
  addToRiderRating,
  createReview,
  findReviewByOrderId,
  updateReview,
} from "../../repositories/review.repository.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

// My order, or "not found" (someone else's order looks the same as no order) [AC-REV-01]
const findMyOrder = async (customerId, orderId) => {
  const order = await findOrderById(orderId);
  if (!order || order.customerId !== customerId) {
    throw new AppError(404, "NOT_FOUND", "Order not found");
  }
  return order;
};

// The rider who delivered it, if there was one
const findRiderOf = async (orderId) => {
  const delivery = await findDeliveryByOrderId(orderId);
  return delivery ? delivery.riderProfileId : null;
};

const noRiderToRate = () =>
  new AppError(400, "VALIDATION_ERROR", "Invalid request data", [
    { field: "riderRating", message: "No rider delivered this order" },
  ]);

// What a review may still do, for the app's buttons [AC-REV-03]
export const reviewOptionsFor = (order, deliveredAt, review, now = new Date()) => {
  if (review) {
    const canEdit =
      now.getTime() - review.createdAt.getTime() <= REVIEW_RULES.editWithinHours * HOUR_MS;
    return { canWrite: false, canEdit };
  }
  const canWrite =
    order.status === "DELIVERED" &&
    deliveredAt !== null &&
    now.getTime() - deliveredAt.getTime() <= REVIEW_RULES.writeWithinDays * DAY_MS;
  return { canWrite, canEdit: false };
};

// My review of one order (or null), with what I can still do
export const getMyReview = async (customerId, orderId, now = new Date()) => {
  const order = await findMyOrder(customerId, orderId);
  const [review, deliveredAt, riderProfileId] = await Promise.all([
    findReviewByOrderId(order.id),
    findDeliveredAt(order.id),
    findRiderOf(order.id),
  ]);

  return {
    review,
    ...reviewOptionsFor(order, deliveredAt, review, now),
    // A rider delivered it, so the form can ask about them too
    canRateRider: Boolean(riderProfileId),
  };
};

// Only the customer, only after delivery, within 7 days, once [AC-REV-01, AC-REV-02, AC-REV-03].
// The review and the restaurant's (and rider's) running totals are saved together, or not at all [AC-REV-04].
export const writeReview = async (customerId, orderId, details, now = new Date()) => {
  const order = await findMyOrder(customerId, orderId);

  if (order.status !== "DELIVERED") {
    throw new AppError(409, "REVIEW_NOT_ALLOWED", "You can review an order once it is delivered");
  }
  const deliveredAt = await findDeliveredAt(order.id);
  if (
    !deliveredAt ||
    now.getTime() - deliveredAt.getTime() > REVIEW_RULES.writeWithinDays * DAY_MS
  ) {
    throw new AppError(
      409,
      "REVIEW_WINDOW_CLOSED",
      `Reviews can be written within ${REVIEW_RULES.writeWithinDays} days of delivery`,
    );
  }

  const riderProfileId = await findRiderOf(order.id);
  if (details.riderRating && !riderProfileId) {
    throw noRiderToRate();
  }

  try {
    return await retryOnDeadlock(() =>
      sequelize.transaction(async (transaction) => {
        const review = await createReview(
          {
            orderId: order.id,
            customerId,
            restaurantId: order.restaurantId,
            riderProfileId: details.riderRating ? riderProfileId : null,
            rating: details.rating,
            riderRating: details.riderRating ?? null,
            comment: details.comment ?? null,
          },
          transaction,
        );

        await addToRestaurantRating(
          order.restaurantId,
          { stars: details.rating, reviews: 1 },
          transaction,
        );
        if (review.riderProfileId) {
          await addToRiderRating(
            review.riderProfileId,
            { stars: details.riderRating, ratings: 1 },
            transaction,
          );
        }
        return review;
      }),
    );
  } catch (error) {
    // Two taps at the same moment: the unique key let only one in
    if (error.name === "SequelizeUniqueConstraintError") {
      throw new AppError(409, "ALREADY_REVIEWED", "You have already reviewed this order");
    }
    throw error;
  }
};

// Change my review within 24 hours of writing it [AC-REV-03]. Only the difference is
// added to the running totals, e.g. 5 stars -> 3 stars is -2 [AC-REV-04].
export const editReview = async (customerId, orderId, details, now = new Date()) => {
  const order = await findMyOrder(customerId, orderId);

  return retryOnDeadlock(() =>
    sequelize.transaction(async (transaction) => {
      const review = await findReviewByOrderId(order.id, transaction);
      if (!review) {
        throw new AppError(404, "NOT_FOUND", "Review not found");
      }
      if (now.getTime() - review.createdAt.getTime() > REVIEW_RULES.editWithinHours * HOUR_MS) {
        throw new AppError(
          409,
          "REVIEW_EDIT_WINDOW_CLOSED",
          `Reviews can be changed within ${REVIEW_RULES.editWithinHours} hours of writing them`,
        );
      }

      // The rider: rated before, rated now, or neither
      const oldRiderRating = review.riderRating;
      const newRiderRating = details.riderRating ?? null;
      let riderProfileId = review.riderProfileId;
      if (newRiderRating && !riderProfileId) {
        riderProfileId = await findRiderOf(order.id);
        if (!riderProfileId) {
          throw noRiderToRate();
        }
      }

      await addToRestaurantRating(
        order.restaurantId,
        { stars: details.rating - review.rating, reviews: 0 },
        transaction,
      );
      if (riderProfileId) {
        const ratingsChange = (newRiderRating ? 1 : 0) - (oldRiderRating ? 1 : 0);
        await addToRiderRating(
          riderProfileId,
          { stars: (newRiderRating || 0) - (oldRiderRating || 0), ratings: ratingsChange },
          transaction,
        );
      }

      return updateReview(
        review,
        {
          rating: details.rating,
          riderRating: newRiderRating,
          riderProfileId: newRiderRating ? riderProfileId : null,
          comment: details.comment ?? null,
        },
        transaction,
      );
    }),
  );
};
