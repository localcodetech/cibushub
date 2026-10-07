import {
  getRestaurantForAdmin,
  listRestaurantsForAdmin,
} from "../../services/restaurant/adminListRestaurants.service.js";
import { sendSuccess } from "../../utils/response.js";

export const listAllRestaurants = async (req, res) => {
  const { restaurants, meta } = await listRestaurantsForAdmin(req.validated.query);

  return sendSuccess(res, restaurants, 200, meta);
};

export const getAnyRestaurant = async (req, res) => {
  const restaurant = await getRestaurantForAdmin(req.params.restaurantId);

  return sendSuccess(res, restaurant);
};
