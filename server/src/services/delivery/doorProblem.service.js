import sequelize from "../../config/database.js";
import AppError from "../../utils/AppError.js";
import { retryOnDeadlock } from "../../utils/database/retryOnDeadlock.js";
import { DELIVERY_RULES } from "../../utils/delivery/deliveryRules.js";
import { riderPayoutFor } from "../../utils/delivery/payout.js";
import { distanceInMetres } from "../../utils/distance.js";
import { changeOrderStatus } from "../order/changeOrderStatus.service.js";
import { getMyCurrentDelivery, lockMyActiveDelivery } from "./deliveryFlow.service.js";
import {
  findDeliveriesWaitedOut,
  findDeliveryForUpdate,
  updateDelivery,
} from "../../repositories/delivery.repository.js";
import { findRiderProfileById } from "../../repositories/rider.repository.js";
import { saveAuditLog } from "../../repositories/auditLog.repository.js";
import { Order, Restaurant } from "../../models/index.js";
import { getLatestLocation } from "../rider/riderLocationStore.js";
import { emitAdminAlert } from "../../sockets/emitAdminAlert.js";
import { emitToUser } from "../../sockets/emitToUser.js";
import { emitToRestaurant } from "../../sockets/emitToRestaurant.js";

// Problems at the door and the way back (ADR 003, decided with the product owner 2026-10-11):
//   1. The rider reports why they can't hand over, near the drop-off.
//   2. Rider and customer see a 10-minute wait. The code still works if the customer comes.
//   3. Nobody acted when it ends: the order is CANCELLED (no refund) and the rider RETURNS
//      the food to the restaurant.
//   4. "Returned": the rider is free and earns 1.5x (the extra half is paid by CibusHub).

// What each problem means, and whether the rider must have called first [AC-DEL-08]
export const DOOR_PROBLEM_RULES = {
  UNREACHABLE: { label: "Customer unreachable", callsFirst: true },
  NOT_AT_ADDRESS: { label: "Customer not at the address", callsFirst: true },
  REFUSED_CODE: { label: "Customer won't give the code", callsFirst: false },
};

const NO_LOCATION = () =>
  new AppError(409, "LOCATION_NEEDED", "We can't see your location. Turn on GPS and try again.");

// The rider reports a problem at the door [AC-DEL-08]. Only near the drop-off pin, so nobody
// can claim the 1.5x return pay from somewhere else.
export const reportDoorProblem = async ({
  userId,
  problemType,
  note,
  ipAddress,
  now = new Date(),
}) => {
  const rule = DOOR_PROBLEM_RULES[problemType];

  const report = await retryOnDeadlock(() =>
    sequelize.transaction(async (transaction) => {
      const { profile, delivery } = await lockMyActiveDelivery(userId, transaction);
      if (delivery.status !== "PICKED_UP") {
        throw new AppError(409, "NOT_PICKED_UP", "Confirm pickup first");
      }
      if (delivery.problemReportedAt) {
        throw new AppError(409, "ALREADY_REPORTED", "You already reported a problem; wait here");
      }
      if (rule.callsFirst && delivery.callAttempts < DELIVERY_RULES.minCallsBeforeUnreachable) {
        throw new AppError(
          409,
          "CALL_THE_CUSTOMER_FIRST",
          `Call the customer at least ${DELIVERY_RULES.minCallsBeforeUnreachable} times first`,
        );
      }

      const order = await Order.findByPk(delivery.orderId, { transaction });
      const riderAt = await getLatestLocation(profile.id);
      if (!riderAt) {
        throw NO_LOCATION();
      }
      const dropoff = { latitude: order.deliveryLatitude, longitude: order.deliveryLongitude };
      const metres = Math.round(distanceInMetres(riderAt, dropoff));
      if (metres > DELIVERY_RULES.doorRadiusMetres) {
        throw new AppError(
          409,
          "NOT_AT_DROPOFF",
          `You are about ${metres} m from the drop-off. Go to the customer's pin first.`,
        );
      }

      const waitEndsAt = new Date(now.getTime() + DELIVERY_RULES.doorWaitMs);
      const reason = note ? `${rule.label}: ${note}` : rule.label;
      await updateDelivery(
        delivery,
        {
          problemType,
          problemReportedAt: now,
          waitEndsAt,
          reportedLatitude: riderAt.latitude,
          reportedLongitude: riderAt.longitude,
          failureReason: reason,
        },
        transaction,
      );
      await saveAuditLog(
        {
          actorId: userId,
          action: "DELIVERY_DOOR_PROBLEM_REPORTED",
          targetType: "order",
          targetId: order.id,
          before: null,
          after: {
            problemType,
            callAttempts: delivery.callAttempts,
            location: { latitude: riderAt.latitude, longitude: riderAt.longitude },
            metresFromDropoff: metres,
          },
          reason,
          ipAddress,
        },
        transaction,
      );

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        riderProfileId: profile.id,
        problemType,
        callAttempts: delivery.callAttempts,
        location: { latitude: riderAt.latitude, longitude: riderAt.longitude },
        waitEndsAt,
        note: note ?? null,
      };
    }),
  );

  const { customerId, ...alert } = report;
  emitAdminAlert("DELIVERY_DOOR_PROBLEM", alert);
  // The customer's app: "Your rider is at your address until 14:32. Show your code or call them."
  emitToUser(customerId, "delivery:problem", {
    orderId: report.orderId,
    problemType,
    waitEndsAt: report.waitEndsAt.toISOString(),
  });

  return getMyCurrentDelivery(userId);
};

// Inside the caller's transaction: the food in the rider's hands goes back to the restaurant.
// Used when the door wait runs out, and when an admin cancels an order after pickup.
export const beginReturn = (delivery, transaction) => {
  return updateDelivery(delivery, { status: "RETURNING" }, transaction);
};

// Tells the rider (go back) and the restaurant (the food is coming back), after commit
export const announceReturn = async (delivery, order, reason) => {
  const rider = await findRiderProfileById(delivery.riderProfileId);
  emitToUser(rider.userId, "delivery:returning", { orderId: order.id, reason });
  emitToRestaurant(order.restaurantId, "order:returning", {
    orderId: order.id,
    orderNumber: order.orderNumber,
  });
};

// One delivery whose wait ran out: cancel the order (no refund) and send the food back.
// Re-checks everything once locked: the customer may have taken it a second ago.
const endWaitedOutDelivery = async (deliveryId, now) => {
  const ended = await retryOnDeadlock(() =>
    sequelize.transaction(async (transaction) => {
      const delivery = await findDeliveryForUpdate(deliveryId, transaction);
      if (!delivery || delivery.status !== "PICKED_UP" || !delivery.waitEndsAt) {
        return null;
      }
      if (delivery.waitEndsAt > now) {
        return null;
      }

      const reason = `Not handed over: ${delivery.failureReason}. No refund; the food was returned to the restaurant.`;
      const order = await changeOrderStatus({
        orderId: delivery.orderId,
        toStatus: "CANCELLED",
        actor: { userId: null, role: "SYSTEM" },
        reason,
        isAllowedFor: () => true,
        onlyIfStatus: "PICKED_UP",
        transaction,
      });
      await beginReturn(delivery, transaction);
      // (No audit line: nobody acted. The status history records SYSTEM with the reason.)
      return { delivery, order, reason };
    }),
  );

  if (ended) {
    await announceReturn(ended.delivery, ended.order, ended.reason);
    emitAdminAlert("DELIVERY_RETURNING", {
      orderId: ended.order.id,
      orderNumber: ended.order.orderNumber,
      riderProfileId: ended.delivery.riderProfileId,
      problemType: ended.delivery.problemType,
    });
  }
  return Boolean(ended);
};

// Every minute: door waits that ran out with nobody acting [AC-DEL-08]
export const sweepDoorWaits = async (now = new Date()) => {
  const waitedOut = await findDeliveriesWaitedOut(now);
  let returning = 0;
  for (const delivery of waitedOut) {
    if (await endWaitedOutDelivery(delivery.id, now)) {
      returning += 1;
    }
  }
  return { checked: waitedOut.length, returning };
};

// "Returned to restaurant": the trip is over. The rider is free and earns 1.5x.
// More than 200 m from the restaurant: warned first, then flagged if they confirm.
export const confirmReturned = async ({ userId, confirmFarAway = false, now = new Date() }) => {
  const result = await retryOnDeadlock(() =>
    sequelize.transaction(async (transaction) => {
      const { profile, delivery } = await lockMyActiveDelivery(userId, transaction);
      if (delivery.status !== "RETURNING") {
        throw new AppError(409, "NOT_RETURNING", "This delivery is not being returned");
      }

      const order = await Order.scope("withEarnings").findByPk(delivery.orderId, { transaction });
      const restaurant = await Restaurant.findByPk(order.restaurantId, { transaction });
      const riderAt = await getLatestLocation(profile.id);
      const metres = riderAt ? Math.round(distanceInMetres(riderAt, restaurant)) : null;
      const farAway = metres === null || metres > DELIVERY_RULES.returnGeofenceMetres;
      if (farAway && !confirmFarAway) {
        throw new AppError(
          409,
          "RETURN_FAR_FROM_RESTAURANT",
          metres === null
            ? "We can't see your location. Confirm only if you gave the food back."
            : `You are about ${metres} m from the restaurant. Confirm only if you gave the food back.`,
          [{ distanceMetres: metres, limitMetres: DELIVERY_RULES.returnGeofenceMetres }],
        );
      }

      const payout = riderPayoutFor(order.riderEarningsPesewas, DELIVERY_RULES.returnPayoutPercent);
      await updateDelivery(
        delivery,
        {
          status: "FAILED",
          failedAt: now,
          returnedAt: now,
          returnDistanceMetres: metres,
          returnFlagged: farAway,
          riderPayoutPesewas: payout,
          settledAt: now,
        },
        transaction,
      );
      await saveAuditLog(
        {
          actorId: userId,
          action: "DELIVERY_RETURNED",
          targetType: "order",
          targetId: order.id,
          before: { deliveryStatus: "RETURNING" },
          after: { deliveryStatus: "FAILED", riderPayoutPesewas: payout, returnFlagged: farAway },
          reason: farAway ? `Confirmed ${metres ?? "?"} m from the restaurant` : null,
          ipAddress: null,
        },
        transaction,
      );
      return { order, payout, farAway, metres, riderProfileId: profile.id };
    }),
  );

  emitToRestaurant(result.order.restaurantId, "order:returned", { orderId: result.order.id });
  if (result.farAway) {
    emitAdminAlert("RETURN_FLAGGED", {
      orderId: result.order.id,
      riderProfileId: result.riderProfileId,
      distanceMetres: result.metres,
    });
  }
  return { orderId: result.order.id, returned: true, earnedPesewas: result.payout };
};
