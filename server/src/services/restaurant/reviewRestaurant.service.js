import sequelize from "../../config/database.js";
import AppError from "../../utils/AppError.js";
import { findUserById, updateUser } from "../../repositories/user.repository.js";
import { findRestaurantById, updateRestaurant } from "../../repositories/restaurant.repository.js";
import { saveAuditLog } from "../../repositories/auditLog.repository.js";
import {
  notifyRestaurantApproved,
  notifyRestaurantRejected,
  notifyRestaurantSuspended,
} from "../notifications/restaurantReviewed.service.js";

// For each new status: the statuses a restaurant is allowed to come from
const ALLOWED_PREVIOUS_STATUSES = {
  APPROVED: ["PENDING_APPROVAL", "SUSPENDED"],
  REJECTED: ["PENDING_APPROVAL"],
  SUSPENDED: ["APPROVED"],
};

const loadRestaurantForReview = async (restaurantId, newStatus) => {
  const restaurant = await findRestaurantById(restaurantId);

  if (!restaurant) {
    throw new AppError(404, "NOT_FOUND", "Restaurant not found");
  }

  if (!ALLOWED_PREVIOUS_STATUSES[newStatus].includes(restaurant.status)) {
    throw new AppError(
      409,
      "INVALID_STATUS_TRANSITION",
      `A restaurant that is ${restaurant.status} cannot be changed to ${newStatus}`,
    );
  }

  return restaurant;
};

// One line in the admin history book: who changed which restaurant, from what to what [AC-ADM-07]
const recordReview = ({ restaurant, previousStatus, admin, reason, transaction }) => {
  return saveAuditLog(
    {
      actorId: admin.id,
      action: `RESTAURANT_${restaurant.status}`,
      targetType: "restaurant",
      targetId: restaurant.id,
      before: { status: previousStatus },
      after: { status: restaurant.status },
      reason: reason || null,
      ipAddress: admin.ipAddress,
    },
    transaction,
  );
};

export const approveRestaurant = async (restaurantId, admin) => {
  const restaurant = await loadRestaurantForReview(restaurantId, "APPROVED");
  const owner = await findUserById(restaurant.ownerId);
  const previousStatus = restaurant.status;

  await sequelize.transaction(async (transaction) => {
    await updateRestaurant(
      restaurant,
      {
        status: "APPROVED",
        approvedAt: restaurant.approvedAt || new Date(),
        rejectionReason: null,
      },
      transaction,
    );

    // The owner's first approved restaurant also unlocks their account [AC-AUTH-05]
    if (owner.status === "PENDING_APPROVAL") {
      await updateUser(owner, { status: "ACTIVE" }, transaction);
    }

    await recordReview({ restaurant, previousStatus, admin, transaction });
  });

  await notifyRestaurantApproved(owner, restaurant);

  return findRestaurantById(restaurantId);
};

export const rejectRestaurant = async (restaurantId, reason, admin) => {
  const restaurant = await loadRestaurantForReview(restaurantId, "REJECTED");
  const owner = await findUserById(restaurant.ownerId);
  const previousStatus = restaurant.status;

  await sequelize.transaction(async (transaction) => {
    await updateRestaurant(
      restaurant,
      { status: "REJECTED", rejectionReason: reason },
      transaction,
    );

    await recordReview({ restaurant, previousStatus, admin, reason, transaction });
  });

  await notifyRestaurantRejected(owner, restaurant);

  return findRestaurantById(restaurantId);
};

export const suspendRestaurant = async (restaurantId, reason, admin) => {
  const restaurant = await loadRestaurantForReview(restaurantId, "SUSPENDED");

  const owner = await findUserById(restaurant.ownerId);
  const previousStatus = restaurant.status;

  await sequelize.transaction(async (transaction) => {
    await updateRestaurant(restaurant, { status: "SUSPENDED" }, transaction);

    await recordReview({ restaurant, previousStatus, admin, reason, transaction });
  });

  await notifyRestaurantSuspended(owner, restaurant, reason);

  return findRestaurantById(restaurantId);
};
