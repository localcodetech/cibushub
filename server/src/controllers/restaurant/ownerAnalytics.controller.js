import { getRestaurantAnalytics } from "../../services/restaurant/ownerAnalytics.service.js";
import { sendSuccess } from "../../utils/response.js";

export const showRestaurantAnalytics = async (req, res) => {
  const analytics = await getRestaurantAnalytics(req.user.id, req.validated.query);

  return sendSuccess(res, analytics);
};
