import logger from "../../config/logger.js";
import AppError from "../../utils/AppError.js";
import { findRestaurantById, updateRestaurant } from "../../repositories/restaurant.repository.js";
import { getMyRestaurant } from "./myRestaurants.service.js";

export const resubmitRestaurant = async (restaurantId, ownerId) => {
  const restaurant = await getMyRestaurant(restaurantId, ownerId);

  if (restaurant.status !== "REJECTED") {
    throw new AppError(
      409,
      "INVALID_STATUS_TRANSITION",
      `A restaurant that is ${restaurant.status} cannot be resubmitted`,
    );
  }

  // The old reason is cleared; the admin reviews the corrected details fresh [AC-REST-03]
  await updateRestaurant(restaurant, { status: "PENDING_APPROVAL", rejectionReason: null });

  logger.info({ restaurantId, ownerId }, "Restaurant resubmitted for approval");

  return findRestaurantById(restaurantId);
};
