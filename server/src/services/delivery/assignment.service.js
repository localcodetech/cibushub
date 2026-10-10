import sequelize from "../../config/database.js";
import logger from "../../config/logger.js";
import AppError from "../../utils/AppError.js";
import { ASSIGNMENT_RULES } from "../../utils/delivery/assignmentRules.js";
import { Order, Restaurant } from "../../models/index.js";
import {
  createDelivery,
  createOffer,
  findDeliveryById,
  findDeliveryByOrderId,
  findDeliveryForUpdate,
  findActiveDeliveryForRider,
  findOfferForUpdate,
  findOfferById,
  findOfferedRiderIds,
  findPendingOfferForDelivery,
  findPendingOfferForRider,
  findPendingOffersOfRider,
  findRidersOnDeliveries,
  findRidersWithPendingOffers,
  findSearchingDeliveries,
  supersedePendingOffers,
  updateDelivery,
  updateOffer,
} from "../../repositories/delivery.repository.js";
import {
  findAvailableRiderProfiles,
  findRiderProfileByUserId,
  lockRiderProfileByUserId,
} from "../../repositories/rider.repository.js";
import { lockOrder } from "../../repositories/order.repository.js";
import { retryOnDeadlock } from "../../utils/database/retryOnDeadlock.js";
import { moveOrderToRiderAssignedIfReady } from "./riderAssigned.service.js";
import { findOnlineRidersNear, getLastSeen } from "../rider/riderLocationStore.js";
import { scheduleDeliverySearch, scheduleOfferExpiry } from "../../jobs/enqueue.js";
import { emitToUser } from "../../sockets/emitToUser.js";
import { emitAdminAlert } from "../../sockets/emitAdminAlert.js";

// The order is still worth delivering while the kitchen has it
const ORDER_STATUSES_NEEDING_A_RIDER = ["ACCEPTED", "PREPARING", "READY_FOR_PICKUP"];
const SWEEP_LIMIT = 100;

// Called inside the "Accept" transaction: the search for a rider starts now [AC-ASSIGN-01].
// The caller schedules the first search once the transaction has committed.
export const openDelivery = async (orderId, now, transaction) => {
  const existing = await findDeliveryByOrderId(orderId, transaction);
  if (existing) {
    return existing;
  }
  return createDelivery(
    { orderId, searchRadiusKm: ASSIGNMENT_RULES.searchRadiusKm, searchStartedAt: now },
    transaction,
  );
};

// What the rider sees in the offer pop-up [AC-ASSIGN-03]: where to collect, how far,
// roughly where it goes, and what they earn. Never the customer's name or phone yet.
const toOfferView = (offer, order, restaurant) => ({
  offerId: offer.id,
  deliveryId: offer.deliveryId,
  restaurantName: restaurant.name,
  restaurantArea: restaurant.area,
  pickupDistanceMetres: offer.pickupDistanceMetres,
  dropoffArea: order.deliveryArea,
  deliveryDistanceMetres: order.deliveryDistanceMeters,
  earningsPesewas: order.riderEarningsPesewas,
  offeredAt: offer.offeredAt,
  expiresAt: offer.expiresAt,
});

// The nearest rider who may be asked, or null [AC-ASSIGN-02]:
// approved, online, a location from the last 2 minutes, no delivery in hand,
// no other offer waiting, and never asked about this delivery before.
const findNearestEligibleRider = async (delivery, restaurant, now, transaction) => {
  const nearby = await findOnlineRidersNear(restaurant, delivery.searchRadiusKm);
  if (nearby.length === 0) {
    return null;
  }

  const ids = nearby.map((rider) => rider.riderId);
  const alreadyAsked = new Set(await findOfferedRiderIds(delivery.id, transaction));
  const busy = new Set([
    ...(await findRidersOnDeliveries(ids, transaction)),
    ...(await findRidersWithPendingOffers(ids, transaction)),
  ]);
  const profiles = await findAvailableRiderProfiles(ids, transaction);
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

  // Nearest first: the first one who passes every check is asked
  for (const candidate of nearby) {
    const profile = profileById.get(candidate.riderId);
    if (!profile || alreadyAsked.has(profile.id) || busy.has(profile.id)) {
      continue;
    }
    const lastSeen = await getLastSeen(profile.id);
    if (!lastSeen || now.getTime() - lastSeen > ASSIGNMENT_RULES.freshLocationMs) {
      continue;
    }
    return { profile, metres: candidate.metres };
  }
  return null;
};

// One step of the search for a rider. Safe to run any number of times, from the job,
// the offer expiry, a decline or the sweep: the delivery row is locked, so steps run one by one.
// Returns what happened: OFFERED, WAITING, NO_RIDER, CLOSED or DONE.
export const offerNextRider = async (deliveryId, now = new Date()) => {
  const outcome = await sequelize.transaction(async (transaction) => {
    const delivery = await findDeliveryForUpdate(deliveryId, transaction);
    if (!delivery || delivery.status !== "SEARCHING") {
      return { result: "DONE" };
    }

    const order = await Order.scope("withEarnings").findByPk(delivery.orderId, { transaction });

    // The order was cancelled or rejected meanwhile: stop looking
    if (!ORDER_STATUSES_NEEDING_A_RIDER.includes(order.status)) {
      await updateDelivery(delivery, { status: "CANCELLED", cancelledAt: now }, transaction);
      await supersedePendingOffers(delivery.id, now, transaction);
      return { result: "CLOSED" };
    }

    // Someone is still thinking about it: wait for them, or move on if their time is up
    const pending = await findPendingOfferForDelivery(delivery.id, transaction);
    if (pending && pending.expiresAt > now) {
      return { result: "WAITING" };
    }
    if (pending) {
      await updateOffer(pending, { outcome: "EXPIRED" }, transaction);
    }

    const restaurant = await Restaurant.findByPk(order.restaurantId, { transaction });
    let chosen = await findNearestEligibleRider(delivery, restaurant, now, transaction);

    // Nobody close enough: look once more, wider [AC-ASSIGN-06]
    if (!chosen && !delivery.radiusWidenedAt) {
      await updateDelivery(
        delivery,
        { searchRadiusKm: ASSIGNMENT_RULES.widenedRadiusKm, radiusWidenedAt: now },
        transaction,
      );
      chosen = await findNearestEligibleRider(delivery, restaurant, now, transaction);
    }

    if (!chosen) {
      // Still nobody after 10 minutes: tell admins and the customer, once [AC-ASSIGN-06]
      const waitedMs = now.getTime() - delivery.searchStartedAt.getTime();
      if (waitedMs >= ASSIGNMENT_RULES.alertAfterMs && !delivery.adminsAlertedAt) {
        await updateDelivery(delivery, { adminsAlertedAt: now }, transaction);
        transaction.afterCommit(() => {
          emitAdminAlert("NO_RIDER_FOUND", {
            orderId: order.id,
            orderNumber: order.orderNumber,
            deliveryId: delivery.id,
          });
          emitToUser(order.customerId, "order:delay", {
            orderId: order.id,
            message: "We're still looking for a rider for your order. Thanks for your patience.",
          });
        });
      }
      return { result: "NO_RIDER" };
    }

    const offer = await createOffer(
      {
        deliveryId: delivery.id,
        riderProfileId: chosen.profile.id,
        pickupDistanceMetres: chosen.metres,
        offeredAt: now,
        expiresAt: new Date(now.getTime() + ASSIGNMENT_RULES.offerSeconds * 1000),
      },
      transaction,
    );

    // Only once it is saved: the rider's phone shows the offer with its 60-second countdown
    const view = toOfferView(offer, order, restaurant);
    transaction.afterCommit(() => emitToUser(chosen.profile.userId, "delivery:offer", view));

    return { result: "OFFERED", offerId: offer.id, riderProfileId: chosen.profile.id };
  });

  // When the 60 seconds are up, this runs again and moves on [AC-ASSIGN-04]
  if (outcome.result === "OFFERED") {
    await scheduleOfferExpiry(
      deliveryId,
      outcome.offerId,
      ASSIGNMENT_RULES.offerSeconds * 1000 + 500,
    );
  }
  return outcome;
};

// "Decline": this rider is never asked again for it, and the next one is asked now [AC-ASSIGN-04]
export const declineOffer = async (userId, offerId, now = new Date()) => {
  const profile = await findRiderProfileByUserId(userId);

  const offer = await sequelize.transaction(async (transaction) => {
    const found = await findOfferForUpdate(offerId, transaction);
    if (!found || !profile || found.riderProfileId !== profile.id) {
      throw new AppError(404, "NOT_FOUND", "Offer not found");
    }
    if (found.outcome !== "PENDING" || found.expiresAt <= now) {
      throw new AppError(409, "OFFER_CLOSED", "This offer is no longer open");
    }
    await updateOffer(found, { outcome: "DECLINED", respondedAt: now }, transaction);
    return found;
  });

  await scheduleDeliverySearch(offer.deliveryId);
};

// "Accept" [AC-ASSIGN-05]: exactly one rider gets a delivery, even if several tap at once.
// Rows are always locked in the same order (rider, delivery, offer, order), so two accepts,
// or an accept and the restaurant's "Ready", wait for each other instead of deadlocking.
export const acceptOffer = async (userId, offerId, now = new Date()) => {
  const result = await retryOnDeadlock(() =>
    sequelize.transaction(async (transaction) => {
      // 1. The rider: one accept at a time per rider [AC-RIDER-06]
      const profile = await lockRiderProfileByUserId(userId, transaction);
      const unlockedOffer = await findOfferById(offerId, transaction);
      if (!profile || !unlockedOffer || unlockedOffer.riderProfileId !== profile.id) {
        throw new AppError(404, "NOT_FOUND", "Offer not found");
      }
      if (profile.status !== "APPROVED" || !profile.isOnline) {
        throw new AppError(409, "RIDER_NOT_AVAILABLE", "Go online to accept deliveries");
      }
      if (await findActiveDeliveryForRider(profile.id, transaction)) {
        throw new AppError(409, "RIDER_BUSY", "Finish your current delivery first");
      }

      // 2. The delivery: whoever locks it first wins; the others find it taken
      const delivery = await findDeliveryForUpdate(unlockedOffer.deliveryId, transaction);
      if (delivery.status !== "SEARCHING") {
        throw new AppError(409, "DELIVERY_TAKEN", "This delivery has already been taken");
      }

      // 3. The offer: still open?
      const offer = await findOfferForUpdate(offerId, transaction);
      if (offer.outcome !== "PENDING" || offer.expiresAt <= now) {
        throw new AppError(409, "OFFER_CLOSED", "This offer is no longer open");
      }

      await updateOffer(offer, { outcome: "ACCEPTED", respondedAt: now }, transaction);
      await updateDelivery(
        delivery,
        { status: "ASSIGNED", riderProfileId: profile.id, assignedAt: now },
        transaction,
      );
      // Nobody else needs to answer for this delivery any more
      await supersedePendingOffers(delivery.id, now, transaction);

      // This rider's other waiting offers close too; those deliveries look again
      const otherOffers = await findPendingOffersOfRider(profile.id, transaction);
      for (const other of otherOffers) {
        await updateOffer(other, { outcome: "SUPERSEDED", respondedAt: now }, transaction);
      }

      // 4. The order: if the food is already ready, the rider is assigned now (ADR 003)
      const order = await lockOrder(delivery.orderId, transaction);
      await moveOrderToRiderAssignedIfReady(order, delivery, transaction);

      return {
        deliveryId: delivery.id,
        orderId: order.id,
        reopenDeliveryIds: otherOffers.map((other) => other.deliveryId),
      };
    }),
  );

  for (const deliveryId of result.reopenDeliveryIds) {
    await scheduleDeliverySearch(deliveryId);
  }
  return { deliveryId: result.deliveryId, orderId: result.orderId };
};

// The offer waiting for this rider, if any (the app asks after it reconnects)
export const getMyPendingOffer = async (userId, now = new Date()) => {
  const profile = await findRiderProfileByUserId(userId);
  if (!profile) {
    return null;
  }
  const offer = await findPendingOfferForRider(profile.id);
  if (!offer || offer.expiresAt <= now) {
    return null;
  }
  const delivery = await findDeliveryById(offer.deliveryId);
  const order = await Order.scope("withEarnings").findByPk(delivery.orderId);
  const restaurant = await Restaurant.findByPk(order.restaurantId);
  return toOfferView(offer, order, restaurant);
};

// Every minute: one search step for each delivery still looking for a rider.
// Catches lost jobs, and asks riders who came online since the last try [AC-JOB-02].
export const sweepSearchingDeliveries = async (now = new Date()) => {
  const searching = await findSearchingDeliveries(SWEEP_LIMIT);
  const results = {};

  for (const delivery of searching) {
    try {
      const { result } = await offerNextRider(delivery.id, now);
      results[result] = (results[result] || 0) + 1;
    } catch (error) {
      logger.error({ err: error, deliveryId: delivery.id }, "Assignment sweep step failed");
    }
  }
  return { checked: searching.length, ...results };
};
