import redis from "../../config/redis.js";
import logger from "../../config/logger.js";
import AppError from "../../utils/AppError.js";
import { findOwnedRestaurant } from "../../repositories/restaurant.repository.js";
import {
  findBestSellers,
  sumRatingsByDay,
  sumRestaurantOrdersByDay,
} from "../../repositories/ownerAnalytics.repository.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const BEST_SELLERS = 5;
// Same as the admin charts: at most 2 minutes behind [AC-ANL-06]
const CACHE_SECONDS = 2 * 60;

// "2026-10-09" -> midnight at the start of that day in Ghana (= UTC)
const startOfDay = (day) => new Date(day + "T00:00:00.000Z");

const listDays = (from, to) => {
  const days = [];
  for (let time = startOfDay(from).getTime(); time <= startOfDay(to).getTime(); time += DAY_MS) {
    days.push(new Date(time).toISOString().slice(0, 10));
  }
  return days;
};

// 4.333 -> 4.3; no reviews -> null
const averageOf = (stars, reviews) =>
  reviews === 0 ? null : Math.round((stars / reviews) * 10) / 10;

// One restaurant's charts for its owner [AC-ANL-03]: orders, earnings, best sellers, ratings.
// Someone else's restaurant looks like no restaurant at all (404), so nothing leaks.
export const getRestaurantAnalytics = async (ownerId, { restaurantId, from, to }) => {
  const restaurant = await findOwnedRestaurant(restaurantId, ownerId);
  if (!restaurant) {
    throw new AppError(404, "NOT_FOUND", "Restaurant not found");
  }

  // After the ownership check, so a cached copy is never handed to the wrong owner
  const cacheKey = "analytics:owner:" + restaurantId + ":" + from + ":" + to;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    logger.warn({ err: error }, "Analytics cache unavailable; reading MySQL");
  }

  const rangeStart = startOfDay(from);
  const rangeEnd = new Date(startOfDay(to).getTime() + DAY_MS);

  const [orderDays, bestSellers, ratingDays] = await Promise.all([
    sumRestaurantOrdersByDay(restaurantId, rangeStart, rangeEnd),
    findBestSellers(restaurantId, rangeStart, rangeEnd, BEST_SELLERS),
    sumRatingsByDay(restaurantId, rangeStart, rangeEnd),
  ]);

  // Every day in the range: 0 orders (not a gap), and no rating (null) on days without reviews
  const ordersByDay = new Map(orderDays.map((row) => [row.day, row]));
  const ratingsByDay = new Map(ratingDays.map((row) => [row.day, row]));
  const days = listDays(from, to).map((day) => {
    const orders = ordersByDay.get(day);
    const ratings = ratingsByDay.get(day);
    return {
      day,
      orders: orders ? orders.orders : 0,
      earningsPesewas: orders ? orders.earningsPesewas : 0,
      reviews: ratings ? ratings.reviews : 0,
      averageRating: ratings ? averageOf(ratings.stars, ratings.reviews) : null,
    };
  });

  const totalStars = ratingDays.reduce((sum, row) => sum + row.stars, 0);
  const totalReviews = ratingDays.reduce((sum, row) => sum + row.reviews, 0);

  const result = {
    restaurant: { id: restaurant.id, name: restaurant.name },
    from,
    to,
    totals: {
      orders: days.reduce((sum, day) => sum + day.orders, 0),
      earningsPesewas: days.reduce((sum, day) => sum + day.earningsPesewas, 0),
      reviews: totalReviews,
      averageRating: averageOf(totalStars, totalReviews),
    },
    days,
    bestSellers,
  };

  try {
    await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_SECONDS);
  } catch {
    // Asking MySQL again next time is fine
  }
  return result;
};
