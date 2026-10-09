import env from "../../config/env/env.js";
import logger from "../../config/logger.js";
import redis from "../../config/redis.js";
import AppError from "../../utils/AppError.js";

// The ONE file that talks to OpenStreetMap's Nominatim geocoder. Free, no API key.
// To move to Google later, replace this file; the rest of the app stays the same.
//
// Nominatim's rules (operations.osmfoundation.org/policies/nominatim):
// - at most 1 request per second for the whole app
// - say who you are in the User-Agent
// - cache results (geocoding.service.js does that)

const TIMEOUT_MS = 8000;
const TURN_KEY = "maps:nominatim:turn";
const WAIT_STEP_MS = 250;
const MAX_WAIT_STEPS = 8; // wait up to 2 seconds for our turn

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const unavailable = () => {
  return new AppError(
    503,
    "MAPS_UNAVAILABLE",
    "Map search isn't working right now. Move the pin instead",
  );
};

// One request per second across every server process: whoever sets the key gets the turn.
// The key deletes itself after 1 second, so the next request can go.
const waitForTurn = async () => {
  for (let step = 0; step < MAX_WAIT_STEPS; step++) {
    let gotTurn;
    try {
      gotTurn = await redis.set(TURN_KEY, "1", "PX", 1000, "NX");
    } catch (error) {
      // Redis is down: go ahead rather than block every address form
      logger.warn({ err: error }, "Maps throttle skipped: Redis unavailable");
      return;
    }

    if (gotTurn) {
      return;
    }
    await sleep(WAIT_STEP_MS);
  }

  throw unavailable();
};

// GET one Nominatim path, e.g. callNominatim("/reverse", { lat: "6.68", lon: "-1.62" }).
// Returns the parsed JSON, or throws 503 MAPS_UNAVAILABLE.
export const callNominatim = async (path, params) => {
  await waitForTurn();

  const query = new URLSearchParams({ format: "jsonv2", ...params });
  const contact = env.GEOCODER_CONTACT_EMAIL ? ` (${env.GEOCODER_CONTACT_EMAIL})` : "";

  let response;
  try {
    response = await fetch(`${env.GEOCODER_URL}${path}?${query}`, {
      headers: {
        "User-Agent": `CibusHub/1.0${contact}`,
        // Place names in English
        "Accept-Language": "en",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    logger.error({ err: error, path }, "Could not reach the geocoder");
    throw unavailable();
  }

  if (!response.ok) {
    logger.error({ path, httpStatus: response.status }, "Geocoder refused");
    throw unavailable();
  }

  return response.json();
};
