import { api } from "@/lib/api";

// The rider's working calls: online/offline, offers and the delivery in hand.

// { applicationStatus, isOnline, wentOnlineAt, lastLocationAt }
export const getRiderStatusRequest = async () => {
  const result = await api.get("/rider/status");
  return result.data;
};

// point = { latitude, longitude, accuracyMetres } [AC-RIDER-03, AC-RIDER-04]
export const goOnlineRequest = async (point) => {
  const result = await api.post("/rider/status/online", point);
  return result.data;
};

export const goOfflineRequest = async () => {
  const result = await api.post("/rider/status/offline");
  return result.data;
};

// The offer waiting for me, or null:
// { offerId, deliveryId, restaurantName, restaurantArea, pickupDistanceMetres, dropoffArea,
//   deliveryDistanceMetres, earningsPesewas, offeredAt, expiresAt, secondsLeft }
export const getCurrentOfferRequest = async () => {
  const result = await api.get("/rider/offers/current");
  return result.data;
};

export const acceptOfferRequest = async (offerId) => {
  const result = await api.post("/rider/offers/" + offerId + "/accept");
  return result.data;
};

export const declineOfferRequest = async (offerId) => {
  const result = await api.post("/rider/offers/" + offerId + "/decline");
  return result.data;
};

// The delivery in hand, or null (see the server's /rider/deliveries/current)
export const getCurrentDeliveryRequest = async () => {
  const result = await api.get("/rider/deliveries/current");
  return result.data;
};

// "Picked up" [AC-DEL-02, AC-DEL-03]. More than 200 m away the server answers 409
// PICKUP_FAR_FROM_RESTAURANT; ask the rider, then send again with confirmFarAway = true.
export const pickUpRequest = async (confirmFarAway) => {
  const result = await api.post("/rider/deliveries/current/pickup", { confirmFarAway });
  return result.data;
};

// "Delivered" with the customer's 4-digit code [AC-DEL-06, AC-DEL-07]
export const completeDeliveryRequest = async (code) => {
  const result = await api.post("/rider/deliveries/current/complete", { code });
  return result.data;
};

// "Call": counted by the server, which answers { phone, callAttempts } [AC-DEL-08]
export const callCustomerRequest = async () => {
  const result = await api.post("/rider/deliveries/current/call");
  return result.data;
};

// A problem at the door [AC-DEL-08]: problemType is "UNREACHABLE", "NOT_AT_ADDRESS" or
// "REFUSED_CODE"; note is optional. A 10-minute wait starts; returns the delivery.
export const reportDoorProblemRequest = async (problemType, note) => {
  const body = note ? { problemType, note } : { problemType };
  const result = await api.post("/rider/deliveries/current/problem", body);
  return result.data;
};

// "Returned to restaurant" (ADR 003). More than 200 m away the server answers 409
// RETURN_FAR_FROM_RESTAURANT; ask the rider, then send again with confirmFarAway = true.
// Returns { orderId, returned, earnedPesewas }.
export const returnedRequest = async (confirmFarAway) => {
  const result = await api.post("/rider/deliveries/current/returned", { confirmFarAway });
  return result.data;
};

// "I can't continue" before pickup, with a reason [AC-ASSIGN-08]
export const giveUpDeliveryRequest = async (reason) => {
  const result = await api.post("/rider/deliveries/current/unassign", { reason });
  return result.data;
};

// Completed deliveries and earnings for the day, week or month containing `date` [AC-RIDER-07].
// Returns { summary: { period, from, to, deliveryCount, earningsPesewas },
//           deliveries: [{ deliveryId, orderNumber, restaurantName, restaurantArea, dropoffArea,
//                          distanceMetres, pickedUpAt, deliveredAt, earningsPesewas }], meta }
export const getEarningsRequest = async ({ period, date, page }) => {
  const query = new URLSearchParams({ period, date, page: String(page) });
  const result = await api.get("/rider/earnings?" + query.toString());
  return { ...result.data, meta: result.meta };
};
