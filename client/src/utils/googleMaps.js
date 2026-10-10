// A link that opens Google Maps (the app on phones) with turn-by-turn directions
// to this point [AC-DEL-01]. No API key needed: it is a plain web link.
export const directionsUrl = (point) => {
  const destination = point.latitude + "," + point.longitude;
  return (
    "https://www.google.com/maps/dir/?api=1&destination=" + destination + "&travelmode=driving"
  );
};
