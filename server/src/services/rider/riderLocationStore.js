import redis from "../../config/redis.js";

// The live side of rider locations, kept in Redis for fast reads [AC-RT-06]:
//   riders:online             a geo set: where each online rider is, for "who is within 5 km?"
//   riders:last-seen          when each online rider last sent a location (score = milliseconds)
//   rider:location:<id>       their latest point: latitude, longitude, accuracy, time
//   rider:location-wait:<id>  exists for 3 seconds after each accepted point (the throttle)
// <id> is the rider profile id.
const ONLINE_GEO = "riders:online";
const LAST_SEEN = "riders:last-seen";
const latestKey = (riderId) => `rider:location:${riderId}`;
const waitKey = (riderId) => `rider:location-wait:${riderId}`;

// At most one accepted point every 3 seconds per rider [AC-RT-05].
// SET ... NX only succeeds if the key doesn't exist yet, so it is safe across API instances.
export const claimLocationSlot = async (riderId, waitMs) => {
  const result = await redis.set(waitKey(riderId), "1", "PX", waitMs, "NX");
  return result === "OK";
};

// The rider's latest point, or null: { latitude, longitude, accuracyMetres, at, historySavedAt }
export const getLatestLocation = async (riderId) => {
  const saved = await redis.hgetall(latestKey(riderId));
  if (!saved.latitude) {
    return null;
  }
  return {
    latitude: Number(saved.latitude),
    longitude: Number(saved.longitude),
    accuracyMetres: saved.accuracyMetres ? Number(saved.accuracyMetres) : null,
    at: Number(saved.at),
    historySavedAt: Number(saved.historySavedAt || 0),
  };
};

// Saves the latest point everywhere it is needed, in one round trip
export const saveLatestLocation = async (riderId, point, atMs, historySavedAt) => {
  await redis
    .multi()
    .geoadd(ONLINE_GEO, point.longitude, point.latitude, riderId)
    .zadd(LAST_SEEN, atMs, riderId)
    .hset(latestKey(riderId), {
      latitude: point.latitude,
      longitude: point.longitude,
      accuracyMetres: point.accuracyMetres ?? "",
      at: atMs,
      historySavedAt,
    })
    .exec();
};

// Gone offline: no longer on the map of available riders
export const forgetRider = async (riderId) => {
  await redis
    .multi()
    .zrem(ONLINE_GEO, riderId)
    .zrem(LAST_SEEN, riderId)
    .del(latestKey(riderId))
    .exec();
};

// When the rider last sent a location (milliseconds), or null
export const getLastSeen = async (riderId) => {
  const score = await redis.zscore(LAST_SEEN, riderId);
  return score === null ? null : Number(score);
};

// Online riders within radiusKm of a point, nearest first: [{ riderId, metres }] [AC-ASSIGN-02]
export const findOnlineRidersNear = async (point, radiusKm) => {
  const found = await redis.geosearch(
    ONLINE_GEO,
    "FROMLONLAT",
    point.longitude,
    point.latitude,
    "BYRADIUS",
    radiusKm,
    "km",
    "ASC",
    "WITHDIST",
  );
  // Redis answers [["riderId", "1234.5678"], ...], distances in the unit asked for (km)
  return found.map(([riderId, km]) => ({ riderId, metres: Math.round(Number(km) * 1000) }));
};
