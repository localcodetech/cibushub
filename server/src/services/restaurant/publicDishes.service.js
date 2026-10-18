import { distanceInKm } from "../../utils/distance.js";
import { buildPageMeta, toLimitAndOffset } from "../../utils/pagination.js";
import { getOpenStatus } from "../../utils/restaurant/openingHours.js";
import { averageRating } from "../../utils/review/reviewRules.js";
import { findPublicDishes } from "../../repositories/restaurant.repository.js";

// What a customer sees about one dish and the kitchen that cooks it (never the legal name,
// owner or review notes: the same public fields as a restaurant card)
const toDishCard = (dish, now, customerLocation) => {
  const restaurant = dish.restaurant;
  const card = {
    id: dish.id,
    name: dish.name,
    description: dish.description,
    pricePesewas: dish.pricePesewas,
    imageUrl: dish.imageUrl,
    tags: dish.tags,
    isAvailable: dish.isAvailable,
    stockRemaining: dish.stockRemaining,
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      area: restaurant.area,
      prepTimeMinutes: restaurant.prepTimeMinutes,
      openStatus: getOpenStatus(restaurant, now),
      averageRating: averageRating(restaurant.ratingTotal, restaurant.reviewCount),
      reviewCount: restaurant.reviewCount,
    },
  };

  // Only when the customer shared where they are [AC-DISC-03]
  if (customerLocation) {
    card.restaurant.distanceKm = distanceInKm(customerLocation, restaurant);
    card.restaurant.deliversToYou = card.restaurant.distanceKm <= restaurant.deliveryRadiusKm;
  }

  return card;
};

// Can be ordered right now: the kitchen is open and the dish isn't sold out
const canOrderNow = (card) =>
  card.restaurant.openStatus.isOpen &&
  card.isAvailable &&
  (card.stockRemaining === null || card.stockRemaining > 0);

// "jollof" -> dishes whose NAME has the word come before ones that only mention it in the
// description (e.g. "Grilled chicken, served with jollof")
const nameMatches = (card, words) => {
  const name = card.name.toLowerCase();
  return words.some((word) => name.includes(word));
};

// Dish search: "who cooks jollof?" across every approved restaurant.
// Order: dishes you can order now first; then name matches; then nearest (when the customer
// shared a location) or cheapest.
export const listPublicDishes = async (query) => {
  const dishes = await findPublicDishes(query.q);

  const now = new Date();
  const customerLocation =
    query.latitude !== undefined ? { latitude: query.latitude, longitude: query.longitude } : null;
  const words = query.q.toLowerCase().split(/\s+/).filter(Boolean);

  let cards = dishes.map((dish) => toDishCard(dish, now, customerLocation));

  // "Open now" depends on the clock, so it is checked here rather than in SQL
  if (query.openNow === true) {
    cards = cards.filter((card) => card.restaurant.openStatus.isOpen);
  }

  cards.sort(
    (first, second) =>
      Number(canOrderNow(second)) - Number(canOrderNow(first)) ||
      Number(nameMatches(second, words)) - Number(nameMatches(first, words)) ||
      (customerLocation ? first.restaurant.distanceKm - second.restaurant.distanceKm : 0) ||
      first.pricePesewas - second.pricePesewas,
  );

  const { limit, offset } = toLimitAndOffset(query);

  return {
    dishes: cards.slice(offset, offset + limit),
    meta: buildPageMeta(query, cards.length),
  };
};
