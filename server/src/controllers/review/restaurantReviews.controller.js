import { listRestaurantReviews } from "../../services/review/restaurantReviews.service.js";
import { sendSuccess } from "../../utils/response.js";

export const listReviews = async (req, res) => {
  const { reviews, meta } = await listRestaurantReviews(
    req.params.restaurantId,
    req.validated.query,
  );

  return sendSuccess(res, reviews, 200, meta);
};
