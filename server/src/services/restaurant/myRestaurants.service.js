import AppError from "../../utils/AppError.js";
import {
  findOwnedRestaurant,
  findRestaurantsByOwner,
} from "../../repositories/restaurant.repository.js";
import { findLastPaidOrderTimes } from "../../repositories/order.repository.js";

// My restaurants, newest first [AC-REST-08], each with lastOrderAt: when it last had a paid
// order (null if never), so screens can open on the restaurant that is busy right now
export const listMyRestaurants = async (ownerId) => {
  const restaurants = await findRestaurantsByOwner(ownerId);
  const lastOrders = await findLastPaidOrderTimes(restaurants.map((restaurant) => restaurant.id));
  return restaurants.map((restaurant) => ({
    ...restaurant.toJSON(),
    lastOrderAt: lastOrders[restaurant.id] || null,
  }));
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
