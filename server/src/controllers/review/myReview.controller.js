import { editReview, getMyReview, writeReview } from "../../services/review/myReview.service.js";
import { sendSuccess } from "../../utils/response.js";

export const getReview = async (req, res) => {
  const result = await getMyReview(req.user.id, req.params.orderId);

  return sendSuccess(res, result);
};

export const createReview = async (req, res) => {
  const review = await writeReview(req.user.id, req.params.orderId, req.validated.body);

  return sendSuccess(res, review, 201);
};

export const updateReview = async (req, res) => {
  const review = await editReview(req.user.id, req.params.orderId, req.validated.body);

  return sendSuccess(res, review);
};
