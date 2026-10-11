import sequelize from "../../config/database.js";
import AppError from "../../utils/AppError.js";
import { retryOnDeadlock } from "../../utils/database/retryOnDeadlock.js";
import { buildPageMeta, toLimitAndOffset } from "../../utils/pagination.js";
import { saveAuditLog } from "../../repositories/auditLog.repository.js";
import {
  addToRestaurantRating,
  addToRiderRating,
  findReviewsForAdmin,
  lockReviewById,
  updateReview,
} from "../../repositories/review.repository.js";

// Admins: every review (hidden ones too), newest first, with filters [AC-REV-07, AC-ADM-09]
export const listReviewsForAdmin = async (query) => {
  const { limit, offset } = toLimitAndOffset(query);
  const { rows, count } = await findReviewsForAdmin({
    hidden: query.hidden,
    restaurantId: query.restaurantId,
    maxRating: query.maxRating,
    limit,
    offset,
  });

  return { reviews: rows, meta: buildPageMeta(query, count) };
};

// Takes the review's stars out of (sign -1) or back into (sign +1) the running totals
const moveStars = async (review, sign, transaction) => {
  await addToRestaurantRating(
    review.restaurantId,
    { stars: sign * review.rating, reviews: sign },
    transaction,
  );
  if (review.riderProfileId && review.riderRating) {
    await addToRiderRating(
      review.riderProfileId,
      { stars: sign * review.riderRating, ratings: sign },
      transaction,
    );
  }
};

// Hide an abusive review, with a reason [AC-REV-07]. In one transaction: the review is
// hidden, its stars leave the averages [AC-REV-04], and the audit log records who and why [AC-ADM-07].
export const hideReview = async (admin, reviewId, reason, now = new Date()) => {
  return retryOnDeadlock(() =>
    sequelize.transaction(async (transaction) => {
      const review = await lockReviewById(reviewId, transaction);
      if (!review) {
        throw new AppError(404, "NOT_FOUND", "Review not found");
      }
      if (review.hiddenAt) {
        throw new AppError(409, "REVIEW_ALREADY_HIDDEN", "This review is already hidden");
      }

      await moveStars(review, -1, transaction);
      await updateReview(
        review,
        { hiddenAt: now, hiddenReason: reason, hiddenBy: admin.id },
        transaction,
      );
      await saveAuditLog(
        {
          actorId: admin.id,
          action: "REVIEW_HIDDEN",
          targetType: "review",
          targetId: review.id,
          before: { hidden: false },
          after: { hidden: true },
          reason,
          ipAddress: admin.ipAddress,
        },
        transaction,
      );
      return review;
    }),
  );
};

// Show it again (hidden by mistake): back in the list and the averages, also audited
export const showReview = async (admin, reviewId, reason) => {
  return retryOnDeadlock(() =>
    sequelize.transaction(async (transaction) => {
      const review = await lockReviewById(reviewId, transaction);
      if (!review) {
        throw new AppError(404, "NOT_FOUND", "Review not found");
      }
      if (!review.hiddenAt) {
        throw new AppError(409, "REVIEW_NOT_HIDDEN", "This review is not hidden");
      }

      const previousReason = review.hiddenReason;
      await moveStars(review, 1, transaction);
      await updateReview(
        review,
        { hiddenAt: null, hiddenReason: null, hiddenBy: null },
        transaction,
      );
      await saveAuditLog(
        {
          actorId: admin.id,
          action: "REVIEW_SHOWN",
          targetType: "review",
          targetId: review.id,
          before: { hidden: true, hiddenReason: previousReason },
          after: { hidden: false },
          reason,
          ipAddress: admin.ipAddress,
        },
        transaction,
      );
      return review;
    }),
  );
};
