import AppError from "../../utils/AppError.js";
import { buildPageMeta, toLimitAndOffset } from "../../utils/pagination.js";
import {
  findRestaurantById,
  findRestaurantsForAdmin,
} from "../../repositories/restaurant.repository.js";

export const listRestaurantsForAdmin = async (query) => {
  const { limit, offset } = toLimitAndOffset(query);

  const { rows, count } = await findRestaurantsForAdmin({ status: query.status, limit, offset });

  return {
    restaurants: rows,
    meta: buildPageMeta(query, count),
  };
};

// Admins can open any restaurant, whatever its status, to review it
export const getRestaurantForAdmin = async (restaurantId) => {
  const restaurant = await findRestaurantById(restaurantId);

  if (!restaurant) {
    throw new AppError(404, "NOT_FOUND", "Restaurant not found");
  }

  return restaurant;
};
