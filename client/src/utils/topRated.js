// When someone earns a "top rated" badge. Enough ratings matter as much as the average:
// one 5-star review is luck, not greatness.

// Restaurants: 4.5 stars or more, from at least 3 reviews (Top rated badge)
export const isTopRatedRestaurant = (restaurant) =>
  restaurant.averageRating !== null &&
  restaurant.averageRating >= 4.5 &&
  restaurant.reviewCount >= 3;

// Riders: 4.5 stars or more, from at least 5 rated deliveries (Top-rated rider badge)
export const isTopRatedRider = (rider) =>
  rider.averageRating !== null && rider.averageRating >= 4.5 && rider.ratingCount >= 5;
