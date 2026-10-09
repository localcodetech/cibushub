import logger from "../../config/logger.js";
import redis from "../../config/redis.js";
import { callNominatim } from "./nominatim.client.js";

const ONE_DAY = 24 * 60 * 60;
const REVERSE_CACHE_SECONDS = 30 * ONE_DAY; // area names hardly ever change
const SEARCH_CACHE_SECONDS = 7 * ONE_DAY;
const MAX_SEARCH_RESULTS = 5;

// A box around Kumasi (west, north, east, south). Results inside it rank first,
// but places elsewhere in Ghana can still be found.
const KUMASI_VIEWBOX = "-1.75,6.80,-1.50,6.55";

// Nominatim's address parts, from the most local to the widest.
// "Ayeduase" (suburb) is more useful to a rider than "Kumasi" (city).
const pickArea = (address) => {
  if (!address) {
    return null;
  }
  return (
    address.suburb ||
    address.neighbourhood ||
    address.quarter ||
    address.residential ||
    address.city_district ||
    address.village ||
    address.town ||
    address.city ||
    null
  );
};

// Read and write the cache without ever failing the request: no cache just means a slower answer
const readCache = async (key) => {
  try {
    const saved = await redis.get(key);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    logger.warn({ err: error }, "Maps cache read failed");
    return null;
  }
};

const writeCache = async (key, value, seconds) => {
  try {
    await redis.set(key, JSON.stringify(value), "EX", seconds);
  } catch (error) {
    logger.warn({ err: error }, "Maps cache write failed");
  }
};

// Pin -> readable area name [AC-MAP-02].
// Never fails: if the geocoder is down, area is null and the customer types it [AC-MAP-06].
// Returns { area: "Ayeduase", displayName: "Ayeduase, Oforikrom, Kumasi, Ghana" }
export const reverseGeocode = async (latitude, longitude) => {
  // 4 decimal places is about 11 metres: pins that close share one cached answer [AC-MAP-05]
  const key = `maps:reverse:${latitude.toFixed(4)},${longitude.toFixed(4)}`;

  const cached = await readCache(key);
  if (cached) {
    return cached;
  }

  let result;
  try {
    result = await callNominatim("/reverse", {
      lat: String(latitude),
      lon: String(longitude),
      zoom: "17", // street level
      addressdetails: "1",
    });
  } catch {
    return { area: null, displayName: null };
  }

  const place = {
    area: pickArea(result.address),
    displayName: result.display_name || null,
  };

  await writeCache(key, place, REVERSE_CACHE_SECONDS);
  return place;
};

// Typed place -> up to 5 places with coordinates [AC-MAP-02].
// Throws 503 MAPS_UNAVAILABLE if the geocoder is down; the customer can still move the pin.
// Returns [{ name, area, displayName, latitude, longitude }]
export const searchPlaces = async (text) => {
  const key = `maps:search:${text.toLowerCase()}`;

  const cached = await readCache(key);
  if (cached) {
    return cached;
  }

  const results = await callNominatim("/search", {
    q: text,
    countrycodes: "gh",
    limit: String(MAX_SEARCH_RESULTS),
    addressdetails: "1",
    viewbox: KUMASI_VIEWBOX,
  });

  const places = results.map((result) => ({
    // "KNUST Main Library, University Road, ..." -> "KNUST Main Library"
    name: result.name || result.display_name.split(",")[0],
    area: pickArea(result.address),
    displayName: result.display_name,
    latitude: Number(result.lat),
    longitude: Number(result.lon),
  }));

  await writeCache(key, places, SEARCH_CACHE_SECONDS);
  return places;
};
