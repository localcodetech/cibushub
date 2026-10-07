import sequelize from "../../config/database.js";
import logger from "../../config/logger.js";
import {
  createOpeningHours,
  createRestaurant,
  findRestaurantById,
} from "../../repositories/restaurant.repository.js";

export const submitRestaurant = async (ownerId, data) => {
  const { openingHours, ...restaurantDetails } = data;

  const restaurantId = await sequelize.transaction(async (transaction) => {
    const restaurant = await createRestaurant(
      { ...restaurantDetails, ownerId, status: "PENDING_APPROVAL" },
      transaction,
    );

    await createOpeningHours(restaurant.id, openingHours, transaction);

    return restaurant.id;
  });

  // Admin notifications (email/SMS) arrive in Step 12; for now we log it
  logger.info({ restaurantId, ownerId }, "Restaurant submitted for approval");

  return findRestaurantById(restaurantId);
};
