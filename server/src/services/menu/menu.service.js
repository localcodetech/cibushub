import { getMyRestaurant } from "../restaurant/myRestaurants.service.js";
import { findFullMenu } from "../../repositories/menu.repository.js";

// The owner sees everything, including sold-out items, even while suspended
export const getMyMenu = async (restaurantId, ownerId) => {
  await getMyRestaurant(restaurantId, ownerId);

  return findFullMenu(restaurantId);
};
