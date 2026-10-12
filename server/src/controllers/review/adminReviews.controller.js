import {
  hideReview,
  listReviewsForAdmin,
  showReview,
} from "../../services/review/moderateReview.service.js";
import { sendSuccess } from "../../utils/response.js";

const adminFrom = (req) => ({ id: req.user.id, ipAddress: req.ip });

export const listReviews = async (req, res) => {
  const { reviews, meta } = await listReviewsForAdmin(req.validated.query);

  return sendSuccess(res, reviews, 200, meta);
};

export const hide = async (req, res) => {
  const review = await hideReview(adminFrom(req), req.params.reviewId, req.validated.body.reason);

  return sendSuccess(res, review);
};

export const show = async (req, res) => {
  const review = await showReview(adminFrom(req), req.params.reviewId, req.validated.body.reason);

  return sendSuccess(res, review);
};
