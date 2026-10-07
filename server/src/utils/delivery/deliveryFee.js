import { distanceInKm } from "../distance.js";
import { divideAndRound } from "../money.js";

// The delivery fee formula, documented in docs/pricing.md [AC-CHK-03]
export const DELIVERY_FEE_RULES = {
  basePesewas: 500, // GHS 5.00 for every delivery
  perKmPesewas: 200, // plus GHS 2.00 per road kilometre
  // Roads wind: a road trip is about 1.3 times the straight line (used until Google Routes is connected)
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

// base + perKm x road km, in whole pesewas
export const deliveryFeeFor = (roadMeters) => {
  const distancePart = divideAndRound(roadMeters * DELIVERY_FEE_RULES.perKmPesewas, 1000);

  return DELIVERY_FEE_RULES.basePesewas + distancePart;
};
