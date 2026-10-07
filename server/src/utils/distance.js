const EARTH_RADIUS_KM = 6371;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

// Straight-line ("as the crow flies") distance between two map pins, in km.
// Uses the haversine formula, which accounts for the Earth being round.
export const distanceInKm = (from, to) => {
  const latitudeChange = toRadians(to.latitude - from.latitude);
  const longitudeChange = toRadians(to.longitude - from.longitude);

  const halfChord =
    Math.sin(latitudeChange / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(longitudeChange / 2) ** 2;

  const angle = 2 * Math.atan2(Math.sqrt(halfChord), Math.sqrt(1 - halfChord));

  // Rounded to 1 decimal place, e.g. 3.4 km
  return Math.round(EARTH_RADIUS_KM * angle * 10) / 10;
};
