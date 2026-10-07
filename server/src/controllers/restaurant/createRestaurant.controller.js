import { submitRestaurant } from "../../services/restaurant/createRestaurant.service.js";
import { sendSuccess } from "../../utils/response.js";

export const createRestaurant = async (req, res) => {
  const restaurant = await submitRestaurant(req.user.id, req.validated.body);

  return sendSuccess(res, restaurant, 201);
};
