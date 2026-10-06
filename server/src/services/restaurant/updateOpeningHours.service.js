import sequelize from "../../config/database.js";
import AppError from "../../utils/AppError.js";
import {
  createOpeningHours,
  deleteOpeningHours,
  findRestaurantById,
} from "../../repositories/restaurant.repository.js";
import { getMyRestaurant } from "./myRestaurants.service.js";

export const replaceOpeningHours = async (restaurantId, ownerId, openingHours) => {
  const restaurant = await getMyRestaurant(restaurantId, ownerId);

  if (restaurant.status === "SUSPENDED") {
    throw new AppError(
      403,
      "FORBIDDEN",
      "This restaurant is suspended and cannot be edited. Please contact support",
    );
  }

  // Remove the old week and save the new one together: never a restaurant with no hours
  await sequelize.transaction(async (transaction) => {
    await deleteOpeningHours(restaurantId, transaction);
    await createOpeningHours(restaurantId, openingHours, transaction);
  });

  return findRestaurantById(restaurantId);
};
