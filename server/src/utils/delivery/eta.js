import { distanceInMetres } from "../distance.js";

// A rough arrival time without a paid routing service (ADR 002, AC-MAP-03 / AC-MAP-06):
// the straight line between the points, made longer because roads wind, at an average
// city speed for the rider's vehicle. Good enough for "about 12 min".
export const ETA_RULES = {
  // Roads are about 40% longer than the straight line in Kumasi
  roadFactor: 1.4,
  // Average speeds in town traffic, km/h
  speedKmh: { MOTORBIKE: 25, CAR: 20, BICYCLE: 12 },
};

// etaMinutes([rider, restaurant, customer], "MOTORBIKE") -> whole minutes, at least 1.
// points: { latitude, longitude } in the order travelled
export const etaMinutes = (points, vehicleType) => {
  let metres = 0;
  for (let index = 1; index < points.length; index += 1) {
    metres += distanceInMetres(points[index - 1], points[index]);
  }
  const speed = ETA_RULES.speedKmh[vehicleType] || ETA_RULES.speedKmh.MOTORBIKE;
  const hours = (metres * ETA_RULES.roadFactor) / 1000 / speed;
  return Math.max(1, Math.ceil(hours * 60));
};
