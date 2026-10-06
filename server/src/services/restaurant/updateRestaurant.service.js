import logger from "../../config/logger.js";
import AppError from "../../utils/AppError.js";
import { findRestaurantById, updateRestaurant } from "../../repositories/restaurant.repository.js";
import { getMyRestaurant } from "./myRestaurants.service.js";

export const updateMyRestaurant = async (restaurantId, ownerId, changes) => {
  const restaurant = await getMyRestaurant(restaurantId, ownerId);

  if (restaurant.status === "SUSPENDED") {
    throw new AppError(
      403,
      "FORBIDDEN",
      "This restaurant is suspended and cannot be edited. Please contact support",
    );
  }

  // Changing the legal name of a live restaurant needs a new admin review [AC-REST-04]
  const legalNameChanged =
    changes.legalName !== undefined && changes.legalName !== restaurant.legalName;
  const needsReReview = legalNameChanged && restaurant.status === "APPROVED";

  if (needsReReview) {
    changes.status = "PENDING_APPROVAL";
  }

  await updateRestaurant(restaurant, changes);

  if (needsReReview) {
    logger.info({ restaurantId, ownerId }, "Restaurant legal name changed, waiting for re-review");
  }

  return findRestaurantById(restaurantId);
};
