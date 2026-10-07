import {
  getPublicRestaurant,
  listPublicRestaurants,
} from "../../services/restaurant/publicRestaurants.service.js";
import { sendSuccess } from "../../utils/response.js";

export const browseRestaurants = async (req, res) => {
  const { restaurants, meta } = await listPublicRestaurants(req.validated.query);

  return sendSuccess(res, restaurants, 200, meta);
};

export const viewRestaurant = async (req, res) => {
  const restaurant = await getPublicRestaurant(req.params.restaurantId);

  return sendSuccess(res, restaurant);
};
