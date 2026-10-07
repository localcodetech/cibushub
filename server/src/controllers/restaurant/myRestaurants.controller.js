import {
  getMyRestaurant,
  listMyRestaurants,
} from "../../services/restaurant/myRestaurants.service.js";
import { sendSuccess } from "../../utils/response.js";

export const listRestaurants = async (req, res) => {
  const restaurants = await listMyRestaurants(req.user.id);

  return sendSuccess(res, restaurants);
};

export const getRestaurant = async (req, res) => {
  const restaurant = await getMyRestaurant(req.params.restaurantId, req.user.id);

  return sendSuccess(res, restaurant);
};
