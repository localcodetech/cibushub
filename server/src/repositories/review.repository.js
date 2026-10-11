import { Op } from "sequelize";
import { Restaurant, Review, RiderProfile, User } from "../models/index.js";

export const findReviewByOrderId = (orderId, transaction) => {
  return Review.findOne({ where: { orderId }, transaction });
};

// A restaurant's reviews, newest first, with the writer's name [AC-REV-05]
export const findRestaurantReviews = ({ restaurantId, limit, offset }) => {
  return Review.findAndCountAll({
    where: { restaurantId },
    include: [{ model: User, as: "customer", attributes: ["fullName"], paranoid: false }],
    order: [
      ["createdAt", "DESC"],
      ["id", "DESC"],
    ],
    limit,
    offset,
  });
};

// Reviews of several restaurants (an owner's), newest first, optionally only unanswered ones
export const findReviewsForRestaurants = ({ restaurantIds, unansweredOnly, limit, offset }) => {
  const where = { restaurantId: { [Op.in]: restaurantIds } };
  if (unansweredOnly) {
    where.ownerReply = null;
  }
  return Review.findAndCountAll({
    where,
    include: [
      { model: User, as: "customer", attributes: ["fullName"], paranoid: false },
      { model: Restaurant, as: "restaurant", attributes: ["id", "name"], paranoid: false },
    ],
    order: [
      ["createdAt", "DESC"],
      ["id", "DESC"],
    ],
    limit,
    offset,
  });
};

export const findReviewById = (reviewId, transaction) => {
  return Review.findByPk(reviewId, {
    include: [{ model: Restaurant, as: "restaurant", attributes: ["id", "name", "ownerId"] }],
    transaction,
  });
};

// Saves the reply only if the review has none yet, in one SQL step.
// Answers true if it was saved, false if a reply was already there.
export const saveReplyIfNone = async (reviewId, reply, repliedAt) => {
  const [changedRows] = await Review.update(
    { ownerReply: reply, ownerRepliedAt: repliedAt },
    { where: { id: reviewId, ownerReply: null } },
  );
  return changedRows === 1;
};

export const createReview = (data, transaction) => {
  return Review.create(data, { transaction });
};

export const updateReview = (review, changes, transaction) => {
  return review.update(changes, { transaction });
};

// Adds to the running totals in one SQL step ("rating_total = rating_total + 4"),
// so two reviews saved at the same moment can't overwrite each other [AC-REV-04].
// Negative numbers take away (e.g. an edit from 5 stars to 3 is -2, count 0).
export const addToRestaurantRating = (restaurantId, { stars, reviews }, transaction) => {
  return Restaurant.increment(
    { ratingTotal: stars, reviewCount: reviews },
    { where: { id: restaurantId }, transaction },
  );
};

export const addToRiderRating = (riderProfileId, { stars, ratings }, transaction) => {
  return RiderProfile.increment(
    { ratingTotal: stars, ratingCount: ratings },
    { where: { id: riderProfileId }, transaction },
  );
};
