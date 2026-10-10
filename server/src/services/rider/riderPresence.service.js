import AppError from "../../utils/AppError.js";
import logger from "../../config/logger.js";
import { distanceInMetres } from "../../utils/distance.js";
import { RiderLocation } from "../../models/index.js";
import {
  findOnlineRiderProfiles,
  findRiderProfileByUserId,
  updateRiderProfile,
} from "../../repositories/rider.repository.js";
import {
  claimLocationSlot,
  forgetRider,
  getLastSeen,
  getLatestLocation,
  saveLatestLocation,
} from "./riderLocationStore.js";
import { findActiveDeliveryForRider } from "../../repositories/delivery.repository.js";
import { shareRiderLocation } from "../delivery/tracking.service.js";
import { emitToUser } from "../../sockets/emitToUser.js";
import { emitAdminAlert } from "../../sockets/emitAdminAlert.js";

// The rules for live locations [AC-RT-05, AC-RT-06, AC-RIDER-05]
export const LOCATION_RULES = {
  // Points closer together than this are ignored
  minGapMs: 3000,
  // Faster than 150 km/h between two points is not a rider in Kumasi traffic
  maxSpeedMetresPerSecond: 150 / 3.6,
  // Small jumps are normal GPS wobble, never "too fast"
  wobbleMetres: 200,
  // After a long silence, the next point is trusted whatever the distance
  trustAfterSilenceMs: 2 * 60 * 1000,
  // How often a point is also written to MySQL
  historyEveryMs: 30 * 1000,
  // Silent this long while online: marked offline
  staleAfterMs: 5 * 60 * 1000,
};

const isValidPoint = (point) =>
  point !== null &&
  typeof point === "object" &&
  Number.isFinite(point.latitude) &&
  Number.isFinite(point.longitude) &&
  point.latitude >= -90 &&
  point.latitude <= 90 &&
  point.longitude >= -180 &&
  point.longitude <= 180 &&
  (point.accuracyMetres === undefined ||
    point.accuracyMetres === null ||
    (Number.isFinite(point.accuracyMetres) && point.accuracyMetres >= 0));

// What the rider's app sees
const toStatusView = (profile, lastSeenMs) => ({
  applicationStatus: profile ? profile.status : "NOT_STARTED",
  isOnline: profile ? profile.isOnline : false,
  wentOnlineAt: profile ? profile.wentOnlineAt : null,
  lastLocationAt: lastSeenMs ? new Date(lastSeenMs) : null,
});

export const getMyRiderStatus = async (userId) => {
  const profile = await findRiderProfileByUserId(userId);
  const lastSeen = profile ? await getLastSeen(profile.id) : null;
  return toStatusView(profile, lastSeen);
};

// Saves one point: always the latest in Redis, and in MySQL if 30 seconds have passed
const storePoint = async (profile, point, now, previous) => {
  const nowMs = now.getTime();
  let historySavedAt = previous ? previous.historySavedAt : 0;

  if (nowMs - historySavedAt >= LOCATION_RULES.historyEveryMs) {
    // On a delivery, the point belongs to that order's trail (disputes); after it, it doesn't
    const activeDelivery = await findActiveDeliveryForRider(profile.id);
    await RiderLocation.create({
      riderProfileId: profile.id,
      orderId: activeDelivery ? activeDelivery.orderId : null,
      latitude: point.latitude,
      longitude: point.longitude,
      accuracyMetres: point.accuracyMetres ? Math.round(point.accuracyMetres) : null,
      recordedAt: now,
    });
    historySavedAt = nowMs;
  }

  await saveLatestLocation(profile.id, point, nowMs, historySavedAt);
};

// "Online": only approved riders, and only with a location [AC-RIDER-03, AC-RIDER-04]
export const goOnline = async (userId, point, now = new Date()) => {
  const profile = await findRiderProfileByUserId(userId);
  if (!profile || profile.status !== "APPROVED") {
    throw new AppError(403, "RIDER_NOT_APPROVED", "Only approved riders can go online");
  }

  if (!profile.isOnline) {
    await updateRiderProfile(profile, { isOnline: true, wentOnlineAt: now });
  }
  await storePoint(profile, point, now, await getLatestLocation(profile.id));
  await claimLocationSlot(profile.id, LOCATION_RULES.minGapMs);

  return getMyRiderStatus(userId);
};

const takeOffline = async (profile) => {
  await updateRiderProfile(profile, { isOnline: false, wentOnlineAt: null });
  await forgetRider(profile.id);
};

// "Offline": no more offers, location sharing stops
export const goOffline = async (userId) => {
  const profile = await findRiderProfileByUserId(userId);
  if (profile && profile.isOnline) {
    await takeOffline(profile);
  }
  return getMyRiderStatus(userId);
};

// One location from the rider's phone, over the socket [AC-RT-05].
// Returns { ok: true } or { ok: false, reason } (the phone simply sends the next one).
export const recordRiderLocation = async (userId, point, now = new Date()) => {
  if (!isValidPoint(point)) {
    return { ok: false, reason: "INVALID" };
  }

  const profile = await findRiderProfileByUserId(userId);
  if (!profile || !profile.isOnline) {
    return { ok: false, reason: "OFFLINE" };
  }

  if (!(await claimLocationSlot(profile.id, LOCATION_RULES.minGapMs))) {
    return { ok: false, reason: "TOO_FREQUENT" };
  }

  // A jump faster than any rider could travel is a GPS error or a fake location
  const previous = await getLatestLocation(profile.id);
  if (previous) {
    const elapsedMs = now.getTime() - previous.at;
    const metres = distanceInMetres(previous, point);
    const tooFast =
      elapsedMs < LOCATION_RULES.trustAfterSilenceMs &&
      metres > LOCATION_RULES.wobbleMetres &&
      metres / Math.max(elapsedMs / 1000, 1) > LOCATION_RULES.maxSpeedMetresPerSecond;

    if (tooFast) {
      logger.warn({ riderId: profile.id, metres, elapsedMs }, "Implausible rider location ignored");
      return { ok: false, reason: "IMPLAUSIBLE" };
    }
  }

  await storePoint(profile, point, now, previous);
  // On a delivery the customer is watching: their map moves [AC-RT-04]
  await shareRiderLocation(profile.id, point, now.getTime());
  return { ok: true };
};

// Every minute: online riders silent for 5 minutes go offline [AC-RIDER-05].
// A rider ON a delivery is never taken offline: phones pause GPS when the screen locks,
// and the food is still on its way. Admins are alerted instead (plan-review C10).
export const sweepStaleRiders = async (now = new Date()) => {
  const online = await findOnlineRiderProfiles();
  let wentOffline = 0;
  let flagged = 0;

  for (const profile of online) {
    const lastSeen = await getLastSeen(profile.id);
    if (lastSeen && now.getTime() - lastSeen < LOCATION_RULES.staleAfterMs) {
      continue;
    }

    const activeDelivery = await findActiveDeliveryForRider(profile.id);
    if (activeDelivery) {
      emitAdminAlert("RIDER_SILENT_ON_DELIVERY", {
        riderProfileId: profile.id,
        orderId: activeDelivery.orderId,
        lastLocationAt: lastSeen ? new Date(lastSeen).toISOString() : null,
      });
      flagged += 1;
      continue;
    }

    await takeOffline(profile);
    emitToUser(profile.userId, "rider:status", { isOnline: false, reason: "NO_LOCATION" });
    wentOffline += 1;
  }

  return { checked: online.length, wentOffline, flagged };
};
