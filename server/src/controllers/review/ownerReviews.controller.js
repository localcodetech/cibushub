import { listOwnerReviews, replyToReview } from "../../services/review/ownerReviews.service.js";
import { sendSuccess } from "../../utils/response.js";

export const listReviews = async (req, res) => {
  const { reviews, meta } = await listOwnerReviews(req.user.id, req.validated.query);

  return sendSuccess(res, reviews, 200, meta);
};

export const reply = async (req, res) => {
  const review = await replyToReview(req.user.id, req.params.reviewId, req.validated.body.reply);

  return sendSuccess(res, review);
};
