import AppError from "../../utils/AppError.js";
import { findRestaurantById, updateRestaurant } from "../../repositories/restaurant.repository.js";
import { getMyRestaurant } from "./myRestaurants.service.js";

export const setAcceptingOrders = async (restaurantId, ownerId, isAcceptingOrders) => {
  const restaurant = await getMyRestaurant(restaurantId, ownerId);

  if (restaurant.status !== "APPROVED") {
    throw new AppError(409, "CONFLICT", "Only approved restaurants can open or close for orders");
  }

  // Only blocks new orders; orders already in progress carry on [AC-REST-06]
  await updateRestaurant(restaurant, { isAcceptingOrders });

  return findRestaurantById(restaurantId);
};
