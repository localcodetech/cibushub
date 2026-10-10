import sequelize from "../../config/database.js";
import AppError from "../../utils/AppError.js";
import { retryOnDeadlock } from "../../utils/database/retryOnDeadlock.js";
import { ASSIGNMENT_RULES } from "../../utils/delivery/assignmentRules.js";
import { changeOrderStatus } from "../order/changeOrderStatus.service.js";
import { moveOrderToRiderAssignedIfReady } from "./riderAssigned.service.js";
import { openDelivery } from "./assignment.service.js";
import { saveAuditLog } from "../../repositories/auditLog.repository.js";
import { lockOrder } from "../../repositories/order.repository.js";
import {
  findActiveDeliveryForRider,
  findDeliveryForOrderForUpdate,
  findPendingOffersOfRider,
  recordAcceptedOffer,
  supersedePendingOffers,
  updateDelivery,
  updateOffer,
} from "../../repositories/delivery.repository.js";
import {
  findRiderProfileById,
  lockRiderProfileById,
  lockRiderProfileByUserId,
} from "../../repositories/rider.repository.js";
import { scheduleDeliverySearch } from "../../jobs/enqueue.js";
import { distanceInMetres } from "../../utils/distance.js";
import { Restaurant } from "../../models/index.js";
import { getLatestLocation } from "../rider/riderLocationStore.js";
import { emitToUser } from "../../sockets/emitToUser.js";

// Tells a rider's app that an order was taken off them, so it closes the delivery screen
const tellRiderTheyWereRemoved = async (riderProfileId, orderId, reason) => {
  const profile = await findRiderProfileById(riderProfileId);
  if (profile) {
    emitToUser(profile.userId, "delivery:unassigned", { orderId, reason });
  }
};

// A rider can be given an order, or taken off it, until the food is picked up
const ORDER_STATUSES_BEFORE_PICKUP = [
  "ACCEPTED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "RIDER_ASSIGNED",
];

const notBeforePickup = () =>
  new AppError(
    409,
    "DELIVERY_ALREADY_PICKED_UP",
    "The food has already been picked up; the rider can't be changed now",
  );

// Takes the rider off a delivery (inside the caller's transaction): the delivery searches
// again, and an order showing "Rider assigned" goes back to "Ready" [AC-ASSIGN-08, ADR 003]
const releaseRider = async ({ delivery, order, actor, reason, now, transaction }) => {
  await updateDelivery(
    delivery,
    {
      status: "SEARCHING",
      riderProfileId: null,
      assignedAt: null,
      // A fresh search: the usual radius, and a fresh 10 minutes before admins are alerted
      searchRadiusKm: ASSIGNMENT_RULES.searchRadiusKm,
      radiusWidenedAt: null,
      searchStartedAt: now,
      adminsAlertedAt: null,
    },
    transaction,
  );

  if (order.status === "RIDER_ASSIGNED") {
    return changeOrderStatus({
      orderId: order.id,
      toStatus: "READY_FOR_PICKUP",
      actor,
      reason,
      isAllowedFor: () => true,
      onlyIfStatus: "RIDER_ASSIGNED",
      transaction,
    });
  }
  return order;
};

// An admin gives an order to a chosen rider, or replaces its rider before pickup [AC-ASSIGN-07].
// Locks: the new rider, then the delivery, then the order (the same order as everywhere else).
export const adminAssignRider = async ({
  orderId,
  riderProfileId,
  reason,
  admin,
  now = new Date(),
}) => {
  const actor = { userId: admin.id, role: admin.role };

  const outcome = await retryOnDeadlock(() =>
    sequelize.transaction(async (transaction) => {
      const rider = await lockRiderProfileById(riderProfileId, transaction);
      if (!rider) {
        throw new AppError(404, "NOT_FOUND", "Rider not found");
      }
      if (rider.status !== "APPROVED" || !rider.isOnline) {
        throw new AppError(409, "RIDER_NOT_AVAILABLE", "This rider is not approved and online");
      }

      let delivery = await findDeliveryForOrderForUpdate(orderId, transaction);
      const order = await lockOrder(orderId, transaction);
      if (!order) {
        throw new AppError(404, "NOT_FOUND", "Order not found");
      }
      if (!ORDER_STATUSES_BEFORE_PICKUP.includes(order.status)) {
        throw new AppError(
          409,
          "ORDER_NOT_ASSIGNABLE",
          "Riders can only be assigned between acceptance and pickup",
        );
      }
      // An accepted order should always have one; make sure
      if (!delivery) {
        delivery = await openDelivery(orderId, now, transaction);
      }
      if (delivery.status === "PICKED_UP") {
        throw notBeforePickup();
      }
      if (delivery.riderProfileId === rider.id) {
        throw new AppError(409, "ALREADY_ASSIGNED", "This rider is already on this order");
      }
      const busyWith = await findActiveDeliveryForRider(rider.id, transaction);
      if (busyWith) {
        throw new AppError(409, "RIDER_BUSY", "This rider is carrying another order");
      }

      const previousRiderId = delivery.riderProfileId;
      let current = order;
      if (previousRiderId) {
        current = await releaseRider({
          delivery,
          order,
          actor,
          reason: `Rider replaced by an admin: ${reason}`,
          now,
          transaction,
        });
      }

      await updateDelivery(
        delivery,
        { status: "ASSIGNED", riderProfileId: rider.id, assignedAt: now },
        transaction,
      );
      await supersedePendingOffers(delivery.id, now, transaction);

      // On record as this rider's accepted offer (how far they were, if we know)
      const restaurant = await Restaurant.findByPk(order.restaurantId, { transaction });
      const riderAt = await getLatestLocation(rider.id);
      await recordAcceptedOffer(
        {
          deliveryId: delivery.id,
          riderProfileId: rider.id,
          pickupDistanceMetres: riderAt ? Math.round(distanceInMetres(riderAt, restaurant)) : 0,
          now,
        },
        transaction,
      );

      // The chosen rider's own waiting offers close; those deliveries search again
      const otherOffers = await findPendingOffersOfRider(rider.id, transaction);
      for (const other of otherOffers) {
        await updateOffer(other, { outcome: "SUPERSEDED", respondedAt: now }, transaction);
      }

      // Food already ready: the order shows "Rider assigned" now, recorded as the admin's move
      await moveOrderToRiderAssignedIfReady(current, delivery, transaction, {
        actor,
        reason: `Rider assigned by an admin: ${reason}`,
      });

      await saveAuditLog(
        {
          actorId: admin.id,
          action: previousRiderId ? "DELIVERY_RIDER_REPLACED" : "DELIVERY_RIDER_ASSIGNED",
          targetType: "order",
          targetId: orderId,
          before: { riderProfileId: previousRiderId },
          after: { riderProfileId: rider.id },
          reason,
          ipAddress: admin.ipAddress,
        },
        transaction,
      );

      return {
        deliveryId: delivery.id,
        riderUserId: rider.userId,
        previousRiderId,
        reopenDeliveryIds: otherOffers.map((other) => other.deliveryId),
      };
    }),
  );

  for (const deliveryId of outcome.reopenDeliveryIds) {
    await scheduleDeliverySearch(deliveryId);
  }
  emitToUser(outcome.riderUserId, "delivery:assigned", { orderId, deliveryId: outcome.deliveryId });
  if (outcome.previousRiderId) {
    await tellRiderTheyWereRemoved(outcome.previousRiderId, orderId, reason);
  }
  return { orderId, deliveryId: outcome.deliveryId, riderProfileId };
};

// Shared by the admin and the rider: take the rider off, then search again [AC-ASSIGN-08]
const unassign = async ({ findDelivery, actor, reason, auditActorId, ipAddress, now }) => {
  const outcome = await retryOnDeadlock(() =>
    sequelize.transaction(async (transaction) => {
      const delivery = await findDelivery(transaction);
      if (delivery.status === "PICKED_UP") {
        throw notBeforePickup();
      }
      if (delivery.status !== "ASSIGNED") {
        throw new AppError(409, "NO_RIDER_ASSIGNED", "No rider is assigned to this order");
      }

      const riderProfileId = delivery.riderProfileId;
      const order = await lockOrder(delivery.orderId, transaction);
      await releaseRider({ delivery, order, actor, reason, now, transaction });

      await saveAuditLog(
        {
          actorId: auditActorId,
          action: "DELIVERY_RIDER_UNASSIGNED",
          targetType: "order",
          targetId: order.id,
          before: { riderProfileId },
          after: { riderProfileId: null },
          reason,
          ipAddress,
        },
        transaction,
      );
      return { deliveryId: delivery.id, orderId: order.id, riderProfileId };
    }),
  );

  // The rider who left has an ACCEPTED offer on record, so they are never asked again
  await scheduleDeliverySearch(outcome.deliveryId);
  return outcome;
};

// An admin takes the rider off an order, with a reason
export const adminUnassignRider = async ({ orderId, reason, admin, now = new Date() }) => {
  const result = await unassign({
    findDelivery: async (transaction) => {
      const delivery = await findDeliveryForOrderForUpdate(orderId, transaction);
      if (!delivery) {
        throw new AppError(404, "NOT_FOUND", "This order has no delivery");
      }
      return delivery;
    },
    actor: { userId: admin.id, role: admin.role },
    reason,
    auditActorId: admin.id,
    ipAddress: admin.ipAddress,
    now,
  });
  await tellRiderTheyWereRemoved(result.riderProfileId, result.orderId, reason);
  return { orderId: result.orderId, deliveryId: result.deliveryId };
};

// The rider can't continue before pickup (e.g. breakdown) and gives the order back
export const riderGiveUpDelivery = async ({ userId, reason, ipAddress, now = new Date() }) => {
  const result = await unassign({
    findDelivery: async (transaction) => {
      // The rider's own row first, then their delivery: the usual lock order
      const profile = await lockRiderProfileByUserId(userId, transaction);
      const active = profile ? await findActiveDeliveryForRider(profile.id, transaction) : null;
      if (!active) {
        throw new AppError(404, "NOT_FOUND", "You have no delivery in hand");
      }
      return findDeliveryForOrderForUpdate(active.orderId, transaction);
    },
    actor: { userId, role: "RIDER" },
    reason,
    auditActorId: userId,
    ipAddress,
    now,
  });
  return { orderId: result.orderId, released: true };
};
