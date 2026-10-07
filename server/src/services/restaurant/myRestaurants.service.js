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

// For changes: my restaurant, and not frozen by a suspension
export const getMyEditableRestaurant = async (restaurantId, ownerId) => {
  const restaurant = await getMyRestaurant(restaurantId, ownerId);

  if (restaurant.status === "SUSPENDED") {
    throw new AppError(
      403,
      "FORBIDDEN",
      "This restaurant is suspended and cannot be edited. Please contact support",
    );
  }

  return restaurant;
};
