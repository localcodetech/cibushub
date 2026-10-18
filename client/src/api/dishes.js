import { api } from "@/lib/api";

// Dish search across every approved restaurant: "who cooks jollof?"
// filters = { q, openNow, page }; empty ones are left out.
// Returns { dishes: [{ id, name, pricePesewas, imageUrl, ..., restaurant: {...} }], meta }
export const getDishesRequest = async (filters) => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, value);
    }
  }

  const result = await api.get("/dishes?" + query.toString());
  return { dishes: result.data, meta: result.meta };
};
