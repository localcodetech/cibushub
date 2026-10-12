import { distanceInKm } from "../distance.js";
import { divideAndRound } from "../money.js";

// The delivery fee formula, documented in docs/pricing.md [AC-CHK-03].
// The base and per-km amounts are platform settings a super admin can change [AC-SADM-02];
// the road factor is not (it goes away when Google Routes is connected).
export const DELIVERY_FEE_RULES = {
  // Roads wind: a road trip is about 1.3 times the straight line
  roadFactor: 1.3,
};

// Straight line, used for the delivery radius, same as the restaurant listing [AC-CHK-04]
export const straightLineKm = (restaurant, address) => {
  return distanceInKm(restaurant, address);
};

// Estimated road distance in whole metres, from the straight line [AC-MAP-06]
export const estimateRoadMeters = (restaurant, address) => {
  return Math.round(straightLineKm(restaurant, address) * 1000 * DELIVERY_FEE_RULES.roadFactor);
};

// base + per km x road km, in whole pesewas.
// settings: the platform settings in force, e.g. { deliveryBasePesewas: 500, deliveryPerKmPesewas: 200 }
export const deliveryFeeFor = (roadMeters, settings) => {
  const distancePart = divideAndRound(roadMeters * settings.deliveryPerKmPesewas, 1000);

  return settings.deliveryBasePesewas + distancePart;
};
