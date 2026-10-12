import { api } from "@/lib/api";

// Every call about reviews lives here [AC-REV-01 to 05].

// A restaurant's reviews, newest first, 20 a page (no login needed).
// Returns { reviews, meta }; each review: { id, customerName, rating, comment, createdAt }
export const getRestaurantReviewsRequest = async (restaurantId, page) => {
  const result = await api.get("/restaurants/" + restaurantId + "/reviews?page=" + page);
  return { reviews: result.data, meta: result.meta };
};

// My review of one order: { review (or null), canWrite, canEdit, canRateRider }
export const getMyReviewRequest = async (orderId) => {
  const result = await api.get("/customer/orders/" + orderId + "/review");
  return result.data;
};

// details = { rating, riderRating (or null), comment (or "") }
export const writeReviewRequest = async (orderId, details) => {
  const result = await api.post("/customer/orders/" + orderId + "/review", details);
  return result.data;
};

// The whole review again, within 24 hours of writing it
export const editReviewRequest = async (orderId, details) => {
  const result = await api.patch("/customer/orders/" + orderId + "/review", details);
  return result.data;
};
