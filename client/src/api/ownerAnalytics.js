import { api } from "@/lib/api";

// The owner's analytics page [AC-ANL-03]

// My restaurants (to choose which one to look at)
export const getMyRestaurantsRequest = async () => {
  const result = await api.get("/owner/restaurants");
  return result.data;
};

// One of my restaurants; from, to: Ghana days like "2026-10-01", both included
export const getRestaurantAnalyticsRequest = async ({ restaurantId, from, to }) => {
  const result = await api.get(
    "/owner/analytics?" + new URLSearchParams({ restaurantId, from, to }),
  );
  return result.data;
};
