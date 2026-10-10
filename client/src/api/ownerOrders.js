import { api } from "@/lib/api";

// Every call to the restaurant owner's /owner/orders endpoints lives here.
// Each order looks like: { id, orderNumber, status, restaurant: { id, name, prepTimeMinutes },
//   customerFirstName, placedAt, paidAt, estimatedReadyAt, restaurantNote, items,
//   subtotalPesewas, restaurantEarningsPesewas, cancellationReason, ownerActions }

// The board: every order still in the kitchen (PAID to PICKED_UP), oldest first [AC-RORD-06]
export const getOwnerBoardRequest = async () => {
  const result = await api.get("/owner/orders");
  return result.data;
};

// Accept [AC-RORD-03]. prepTimeMinutes (5 to 180) tells the customer when to expect it.
export const acceptOrderRequest = async (orderId, prepTimeMinutes) => {
  const result = await api.post("/owner/orders/" + orderId + "/accept", { prepTimeMinutes });
  return result.data;
};

// Reject with a reason; the customer gets a full refund [AC-RORD-03]
export const rejectOrderRequest = async (orderId, reason) => {
  const result = await api.post("/owner/orders/" + orderId + "/reject", { reason });
  return result.data;
};

// One tap each: "Start preparing", then "Ready for pickup" [AC-RORD-05]
export const startPreparingRequest = async (orderId) => {
  const result = await api.post("/owner/orders/" + orderId + "/preparing");
  return result.data;
};

export const markReadyRequest = async (orderId) => {
  const result = await api.post("/owner/orders/" + orderId + "/ready");
  return result.data;
};
