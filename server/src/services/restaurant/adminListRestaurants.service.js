import AppError from "../../utils/AppError.js";
import { buildPageMeta, toLimitAndOffset } from "../../utils/pagination.js";
import {
  findRestaurantById,
  findRestaurantsForAdmin,
} from "../../repositories/restaurant.repository.js";
import { findUserById } from "../../repositories/user.repository.js";
import {
  countRestaurantOrdersByStatus,
  findRecentRestaurantOrders,
  sumDeliveredOrders,
} from "../../repositories/order.repository.js";
import { averageRating } from "../../utils/review/reviewRules.js";

const PERFORMANCE_DAYS = 30;
const RECENT_ORDERS = 10;

export const listRestaurantsForAdmin = async (query) => {
  const { limit, offset } = toLimitAndOffset(query);

  const { rows, count } = await findRestaurantsForAdmin({
    status: query.status,
    search: query.q,
    limit,
    offset,
  });

  return {
    restaurants: rows,
    meta: buildPageMeta(query, count),
  };
};

// How a restaurant has been doing over the last 30 days [AC-ADM-03]
const performanceOf = async (restaurant, now) => {
  const since = new Date(now.getTime() - PERFORMANCE_DAYS * 24 * 60 * 60 * 1000);
  const [ordersByStatus, deliveredPesewas, recentOrders] = await Promise.all([
    countRestaurantOrdersByStatus(restaurant.id, since),
    sumDeliveredOrders(restaurant.id, since),
    findRecentRestaurantOrders(restaurant.id, RECENT_ORDERS),
  ]);
  const totalOrders = Object.values(ordersByStatus).reduce((sum, count) => sum + count, 0);

  return {
    days: PERFORMANCE_DAYS,
    totalOrders,
    ordersByStatus,
    deliveredPesewas,
    averageRating: averageRating(restaurant.ratingTotal, restaurant.reviewCount),
    reviewCount: restaurant.reviewCount,
    recentOrders,
  };
};

// Admins can open any restaurant, whatever its status, to review it:
// the details, the owner's contact, and how it has been doing [AC-ADM-03]
export const getRestaurantForAdmin = async (restaurantId, now = new Date()) => {
  const restaurant = await findRestaurantById(restaurantId);

  if (!restaurant) {
    throw new AppError(404, "NOT_FOUND", "Restaurant not found");
  }

  const [owner, performance] = await Promise.all([
    findUserById(restaurant.ownerId),
    performanceOf(restaurant, now),
  ]);

  return {
    ...restaurant.toJSON(),
    owner: owner
      ? { id: owner.id, fullName: owner.fullName, email: owner.email, phone: owner.phone }
      : null,
    performance,
  };
};
