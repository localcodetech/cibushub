import AppError from "../../utils/AppError.js";
import {
  findOwnedRestaurant,
  findRestaurantsByOwner,
} from "../../repositories/restaurant.repository.js";

export const listMyRestaurants = (ownerId) => {
  return findRestaurantsByOwner(ownerId);
};

export const getMyRestaurant = async (restaurantId, ownerId) => {
  const restaurant = await findOwnedRestaurant(restaurantId, ownerId);

  // Someone else's restaurant looks exactly like one that does not exist
  if (!restaurant) {
    throw new AppError(404, "NOT_FOUND", "Restaurant not found");
  }

  return restaurant;
};
