import AppError from "../../utils/AppError.js";
import { distanceInKm } from "../../utils/distance.js";
import { buildPageMeta, toLimitAndOffset } from "../../utils/pagination.js";
import { getOpenStatus } from "../../utils/restaurant/openingHours.js";
import { getCachedMenu } from "../menu/menuCache.service.js";
import {
  findMatchingDishes,
  findPublicRestaurants,
  findRestaurantById,
} from "../../repositories/restaurant.repository.js";

const MAX_DISHES_PER_RESULT = 3;

// What a customer may see about a restaurant: never the legal name, owner or review notes
const toPublicCard = (restaurant, now, customerLocation) => {
  const card = {
    id: restaurant.id,
    name: restaurant.name,
    description: restaurant.description,
    cuisineTags: restaurant.cuisineTags,
    area: restaurant.area,
    city: restaurant.city,
    logoUrl: restaurant.logoUrl,
    coverImageUrl: restaurant.coverImageUrl,
    minOrderPesewas: restaurant.minOrderPesewas,
    prepTimeMinutes: restaurant.prepTimeMinutes,
    deliveryRadiusKm: restaurant.deliveryRadiusKm,
    openStatus: getOpenStatus(restaurant, now),
    createdAt: restaurant.createdAt,
  };

  // Only when the customer shared where they are [AC-DISC-03]
  if (customerLocation) {
    card.distanceKm = distanceInKm(customerLocation, restaurant);
    card.deliversToYou = card.distanceKm <= restaurant.deliveryRadiusKm;
  }

  return card;
};

// Each sort compares two cards; a negative number puts the first one earlier
const SORTERS = {
  distance: (first, second) => first.distanceKm - second.distanceKm,
  deliveryTime: (first, second) => first.prepTimeMinutes - second.prepTimeMinutes,
  name: (first, second) => first.name.localeCompare(second.name),
  newest: (first, second) => second.createdAt - first.createdAt,
  // Default without a location: open restaurants first, then A to Z
  openFirst: (first, second) =>
    Number(second.openStatus.isOpen) - Number(first.openStatus.isOpen) ||
    first.name.localeCompare(second.name),
};

// [AC-DISC-01, AC-DISC-05, AC-DISC-07, AC-DISC-08, AC-GLOBAL-04]
export const listPublicRestaurants = async (query) => {
  const restaurants = await findPublicRestaurants({ search: query.q, cuisine: query.cuisine });

  const now = new Date();
  const customerLocation =
    query.latitude !== undefined ? { latitude: query.latitude, longitude: query.longitude } : null;

  let cards = restaurants.map((restaurant) => toPublicCard(restaurant, now, customerLocation));

  // "Open now" depends on the clock, so it is checked here rather than in SQL
  if (query.openNow === true) {
    cards = cards.filter((card) => card.openStatus.isOpen);
  }

  const sortBy = query.sort ?? (customerLocation ? "distance" : "openFirst");
  cards.sort(SORTERS[sortBy]);

  // Cut out the requested page
  const { limit, offset } = toLimitAndOffset(query);
  const pageOfCards = cards.slice(offset, offset + limit);

  // Show which dishes matched the search, e.g. "Waakye Special"
  if (query.q && pageOfCards.length > 0) {
    const dishes = await findMatchingDishes(
      pageOfCards.map((card) => card.id),
      query.q,
    );

    for (const card of pageOfCards) {
      card.matchingDishes = dishes
        .filter((dish) => dish.restaurantId === card.id)
        .slice(0, MAX_DISHES_PER_RESULT);
    }
  }

  return {
    restaurants: pageOfCards,
    meta: buildPageMeta(query, cards.length),
  };
};

// The restaurant page with its menu [AC-DISC-10]
export const getPublicRestaurant = async (restaurantId) => {
  const restaurant = await findRestaurantById(restaurantId);

  // Pending, rejected and suspended restaurants look like they do not exist [AC-DISC-02]
  if (!restaurant || restaurant.status !== "APPROVED") {
    throw new AppError(404, "NOT_FOUND", "Restaurant not found");
  }

  const menu = await getCachedMenu(restaurantId);

  return {
    ...toPublicCard(restaurant, new Date(), null),
    phone: restaurant.phone,
    addressLine: restaurant.addressLine,
    latitude: restaurant.latitude,
    longitude: restaurant.longitude,
    openingHours: restaurant.openingHours,
    menu,
  };
};
