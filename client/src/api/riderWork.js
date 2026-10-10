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
