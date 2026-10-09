import { api } from "@/lib/api";

// Every call to the backend's public /restaurants endpoints lives here.

// One page of approved restaurants [AC-DISC-01].
// filters = { page, q, cuisine, openNow, sort, latitude, longitude }; empty ones are left out.
// Returns { restaurants: [...], meta: { page, pageSize, totalItems, totalPages } }
export const getRestaurantsRequest = async (filters) => {
  // URLSearchParams builds "?page=2&q=jollof" and makes the text safe for a URL
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  }

  const result = await api.get("/restaurants?" + query.toString());
  return { restaurants: result.data, meta: result.meta };
};

// One approved restaurant with its opening hours and full menu [AC-DISC-10].
// A pending, rejected or suspended restaurant answers 404, like it doesn't exist [AC-DISC-02].
export const getRestaurantRequest = async (restaurantId) => {
  const result = await api.get("/restaurants/" + restaurantId);
  return result.data;
};
