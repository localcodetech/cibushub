import sequelize from "../../config/database.js";
import AppError from "../../utils/AppError.js";
import { retryOnDeadlock } from "../../utils/database/retryOnDeadlock.js";
import { DELIVERY_RULES } from "../../utils/delivery/deliveryRules.js";
import { deliveryCodeMatches } from "../../utils/delivery/deliveryCode.js";
import { distanceInMetres } from "../../utils/distance.js";
import { changeOrderStatus } from "../order/changeOrderStatus.service.js";
import { findOrderItems, lockOrder } from "../../repositories/order.repository.js";
import {
  findActiveDeliveryForRider,
  findDeliveriesLockedSince,
  findDeliveryForOrderForUpdate,
  findDeliveryForUpdate,
  updateDelivery,
} from "../../repositories/delivery.repository.js";
import {
  findRiderProfileById,
  findRiderProfileByUserId,
  lockRiderProfileByUserId,
} from "../../repositories/rider.repository.js";
import { Order, Restaurant, User } from "../../models/index.js";
import { getLatestLocation } from "../rider/riderLocationStore.js";
import { saveAuditLog } from "../../repositories/auditLog.repository.js";
import { emitAdminAlert } from "../../sockets/emitAdminAlert.js";
import { emitToUser } from "../../sockets/emitToUser.js";

const noDelivery = () => new AppError(404, "NOT_FOUND", "You have no delivery in hand");

// What the rider's delivery screen shows [AC-DEL-01, AC-DEL-04, AC-DEL-05].
// Before pickup: where to collect, and only the drop-off AREA.
// After pickup: the customer's first name, exact pin, address details and phone.
// Once delivered there is no "current" delivery, so the phone is gone with it.
const toDeliveryView = async (delivery, order, restaurant) => {
  const pickedUp = delivery.status === "PICKED_UP";
  const items = await findOrderItems(order.id);

  let dropoff = { area: order.deliveryArea };
  if (pickedUp) {
    const customer = await User.findByPk(order.customerId);
    dropoff = {
      area: order.deliveryArea,
      customerFirstName: customer.fullName.split(" ")[0],
      latitude: Number(order.deliveryLatitude),
      longitude: Number(order.deliveryLongitude),
      ghanaPostGps: order.deliveryGhanaPostGps,
      landmark: order.deliveryLandmark,
      instructions: order.riderNote,
      phone: order.contactPhone,
    };
  }

  return {
    deliveryId: delivery.id,
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: delivery.status,
    // false while the kitchen is still cooking: "Picked up" waits for "Ready"
    foodReady: order.status === "RIDER_ASSIGNED" || pickedUp,
    earningsPesewas: order.riderEarningsPesewas,
    assignedAt: delivery.assignedAt,
    pickedUpAt: delivery.pickedUpAt,
    items: items.map((item) => ({ name: item.name, quantity: item.quantity })),
    pickup: {
      restaurantName: restaurant.name,
      phone: restaurant.phone,
      addressLine: restaurant.addressLine,
      area: restaurant.area,
      latitude: Number(restaurant.latitude),
      longitude: Number(restaurant.longitude),
    },
    dropoff,
    codeAttemptsLeft: DELIVERY_RULES.maxCodeAttempts - delivery.codeAttempts,
    callAttempts: delivery.callAttempts,
    // "Customer unreachable" appears once the rider has called enough times [AC-DEL-08]
    canReportUnreachable:
      pickedUp &&
      !delivery.unreachableReportedAt &&
      delivery.callAttempts >= DELIVERY_RULES.minCallsBeforeUnreachable,
    unreachableReportedAt: delivery.unreachableReportedAt,
  };
};

// The delivery this rider is on, or null [AC-DEL-01, AC-DEL-04]
export const getMyCurrentDelivery = async (userId) => {
  const profile = await findRiderProfileByUserId(userId);
  const delivery = profile ? await findActiveDeliveryForRider(profile.id) : null;
  if (!delivery) {
    return null;
  }
  const order = await Order.scope("withEarnings").findByPk(delivery.orderId);
  const restaurant = await Restaurant.findByPk(order.restaurantId);
  return toDeliveryView(delivery, order, restaurant);
};

// The rider's row, then their delivery: the lock order every delivery path uses
const lockMyActiveDelivery = async (userId, transaction) => {
  const profile = await lockRiderProfileByUserId(userId, transaction);
  const active = profile ? await findActiveDeliveryForRider(profile.id, transaction) : null;
  if (!active) {
    throw noDelivery();
  }
  // An admin may have taken it off them a moment ago: check again once it is locked
  const delivery = await findDeliveryForUpdate(active.id, transaction);
  if (delivery.riderProfileId !== profile.id) {
    throw noDelivery();
  }
  return { profile, delivery };
};

// "Picked up" [AC-DEL-02, AC-DEL-03]. Only once the kitchen has marked it ready.
// Further than 200 m from the restaurant (or no known location): refused with a warning,
// unless the rider confirms; then it goes through, flagged for admins.
export const confirmPickup = async ({ userId, confirmFarAway = false, now = new Date() }) => {
  await retryOnDeadlock(() =>
    sequelize.transaction(async (transaction) => {
      const { profile, delivery } = await lockMyActiveDelivery(userId, transaction);
      if (delivery.status === "PICKED_UP") {
        throw new AppError(409, "DELIVERY_ALREADY_PICKED_UP", "You already picked this order up");
      }

      const order = await lockOrder(delivery.orderId, transaction);
      if (order.status !== "RIDER_ASSIGNED") {
        throw new AppError(409, "FOOD_NOT_READY", "The restaurant hasn't marked this order ready");
      }

      const restaurant = await Restaurant.findByPk(order.restaurantId, { transaction });
      const riderAt = await getLatestLocation(profile.id);
      const metres = riderAt ? Math.round(distanceInMetres(riderAt, restaurant)) : null;
      const farAway = metres === null || metres > DELIVERY_RULES.pickupGeofenceMetres;

      if (farAway && !confirmFarAway) {
        throw new AppError(
          409,
          "PICKUP_FAR_FROM_RESTAURANT",
          metres === null
            ? "We can't see your location. Confirm only if you have the food."
            : `You are about ${metres} m from the restaurant. Confirm only if you have the food.`,
          [{ distanceMetres: metres, limitMetres: DELIVERY_RULES.pickupGeofenceMetres }],
        );
      }

      await updateDelivery(
        delivery,
        {
          status: "PICKED_UP",
          pickedUpAt: now,
          pickupDistanceMetres: metres,
          pickupFlagged: farAway,
        },
        transaction,
      );
      // The customer hears about it through the usual order update [AC-RT-03]
      await changeOrderStatus({
        orderId: order.id,
        toStatus: "PICKED_UP",
        actor: { userId, role: "RIDER" },
        isAllowedFor: () => true, // checked above: this rider's own delivery
        onlyIfStatus: "RIDER_ASSIGNED",
        transaction,
      });

      if (farAway) {
        transaction.afterCommit(() =>
          emitAdminAlert("PICKUP_FLAGGED", {
            orderId: order.id,
            orderNumber: order.orderNumber,
            riderProfileId: profile.id,
            distanceMetres: metres,
          }),
        );
      }
    }),
  );

  return getMyCurrentDelivery(userId);
};

// "Delivered", with the customer's 4-digit code [AC-DEL-06, AC-DEL-07].
// A wrong code is counted (and that count is saved); after 5 the code locks and admins are told.
// Once delivered, the rider has no active delivery: free for offers, and their location
// is no longer tied to this order.
export const completeDelivery = async ({ userId, code, now = new Date() }) => {
  const outcome = await retryOnDeadlock(() =>
    sequelize.transaction(async (transaction) => {
      const { profile, delivery } = await lockMyActiveDelivery(userId, transaction);
      if (delivery.status !== "PICKED_UP") {
        throw new AppError(409, "NOT_PICKED_UP", "Confirm pickup first");
      }
      if (delivery.codeAttempts >= DELIVERY_RULES.maxCodeAttempts) {
        throw new AppError(
          429,
          "DELIVERY_CODE_LOCKED",
          "Too many wrong codes. CibusHub support has been told and will contact you.",
        );
      }

      if (!deliveryCodeMatches(delivery.id, code)) {
        // Saved, not thrown here: throwing would undo the count
        const attempts = delivery.codeAttempts + 1;
        const changes = { codeAttempts: attempts };
        if (attempts >= DELIVERY_RULES.maxCodeAttempts) {
          changes.codeLockedAt = now;
        }
        await updateDelivery(delivery, changes, transaction);
        return {
          wrongCode: true,
          attemptsLeft: DELIVERY_RULES.maxCodeAttempts - attempts,
          orderId: delivery.orderId,
          riderProfileId: profile.id,
        };
      }

      await updateDelivery(delivery, { status: "DELIVERED", deliveredAt: now }, transaction);
      await changeOrderStatus({
        orderId: delivery.orderId,
        toStatus: "DELIVERED",
        actor: { userId, role: "RIDER" },
        isAllowedFor: () => true,
        onlyIfStatus: "PICKED_UP",
        transaction,
      });
      return { wrongCode: false, orderId: delivery.orderId };
    }),
  );

  if (outcome.wrongCode) {
    if (outcome.attemptsLeft === 0) {
      emitAdminAlert("DELIVERY_CODE_LOCKED", {
        orderId: outcome.orderId,
        riderProfileId: outcome.riderProfileId,
      });
    }
    throw new AppError(
      400,
      "WRONG_DELIVERY_CODE",
      outcome.attemptsLeft > 0
        ? `Wrong code. ${outcome.attemptsLeft} attempt(s) left.`
        : "Wrong code. The code is now locked; CibusHub support will contact you.",
    );
  }

  return { orderId: outcome.orderId, delivered: true };
};

// The rider tapped "Call": counted here, then the phone dials [AC-DEL-04, AC-DEL-08].
// The count is the proof of "attempted to call" that admins see with an unreachable report.
export const recordCallAttempt = async ({ userId, now = new Date() }) => {
  const result = await retryOnDeadlock(() =>
    sequelize.transaction(async (transaction) => {
      const { delivery } = await lockMyActiveDelivery(userId, transaction);
      if (delivery.status !== "PICKED_UP") {
        throw new AppError(409, "NOT_PICKED_UP", "Confirm pickup first");
      }
      await updateDelivery(
        delivery,
        { callAttempts: delivery.callAttempts + 1, lastCallAt: now },
        transaction,
      );
      const order = await Order.findByPk(delivery.orderId, { transaction });
      return { phone: order.contactPhone, callAttempts: delivery.callAttempts };
    }),
  );
  return result;
};

// "Customer unreachable" [AC-DEL-08]. Policy (plan-review, ADR 003): the rider keeps the food
// and waits; admins are alerted with where the rider is and how often they called; the
// customer's app is told to call the rider. If the customer turns up, the code still works.
// Otherwise an admin cancels the order (the delivery becomes FAILED) and chooses the refund.
export const reportCustomerUnreachable = async ({ userId, note, ipAddress, now = new Date() }) => {
  const report = await retryOnDeadlock(() =>
    sequelize.transaction(async (transaction) => {
      const { profile, delivery } = await lockMyActiveDelivery(userId, transaction);
      if (delivery.status !== "PICKED_UP") {
        throw new AppError(409, "NOT_PICKED_UP", "Confirm pickup first");
      }
      if (delivery.unreachableReportedAt) {
        throw new AppError(409, "ALREADY_REPORTED", "You already reported this; support is on it");
      }
      if (delivery.callAttempts < DELIVERY_RULES.minCallsBeforeUnreachable) {
        throw new AppError(
          409,
          "CALL_THE_CUSTOMER_FIRST",
          `Call the customer at least ${DELIVERY_RULES.minCallsBeforeUnreachable} times first`,
        );
      }

      const riderAt = await getLatestLocation(profile.id);
      const reason = note ? `Customer unreachable: ${note}` : "Customer unreachable";
      await updateDelivery(
        delivery,
        {
          unreachableReportedAt: now,
          reportedLatitude: riderAt ? riderAt.latitude : null,
          reportedLongitude: riderAt ? riderAt.longitude : null,
          failureReason: reason,
        },
        transaction,
      );

      const order = await Order.findByPk(delivery.orderId, { transaction });
      await saveAuditLog(
        {
          actorId: userId,
          action: "DELIVERY_UNREACHABLE_REPORTED",
          targetType: "order",
          targetId: order.id,
          before: null,
          after: { callAttempts: delivery.callAttempts, location: riderAt },
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
        callAttempts: delivery.callAttempts,
        location: riderAt ? { latitude: riderAt.latitude, longitude: riderAt.longitude } : null,
        note: note ?? null,
      };
    }),
  );

  const { customerId, ...alert } = report;
  emitAdminAlert("CUSTOMER_UNREACHABLE", alert);
  emitToUser(customerId, "delivery:unreachable", { orderId: report.orderId });

  return getMyCurrentDelivery(userId);
};

// Admin: after 5 wrong codes, a check with the customer (e.g. by phone), then the rider
// may try again [AC-DEL-06]
export const adminUnlockDeliveryCode = async ({ orderId, reason, admin }) => {
  const riderProfileId = await retryOnDeadlock(() =>
    sequelize.transaction(async (transaction) => {
      const delivery = await findDeliveryForOrderForUpdate(orderId, transaction);
      if (!delivery) {
        throw new AppError(404, "NOT_FOUND", "This order has no delivery");
      }
      if (delivery.status !== "PICKED_UP") {
        throw new AppError(409, "NOT_PICKED_UP", "The food hasn't been picked up");
      }
      await updateDelivery(
        delivery,
        { codeAttempts: 0, codeLockedAt: null, codeLockRemindedAt: null },
        transaction,
      );
      await saveAuditLog(
        {
          actorId: admin.id,
          action: "DELIVERY_CODE_UNLOCKED",
          targetType: "order",
          targetId: orderId,
          before: { codeAttempts: delivery.codeAttempts },
          after: { codeAttempts: 0 },
          reason,
          ipAddress: admin.ipAddress,
        },
        transaction,
      );
      return delivery.riderProfileId;
    }),
  );

  const rider = await findRiderProfileById(riderProfileId);
  emitToUser(rider.userId, "delivery:code-unlocked", { orderId });
  return { orderId, codeAttemptsLeft: DELIVERY_RULES.maxCodeAttempts };
};

// Is this delivery's code locked (5 wrong tries)? Then the customer may confirm instead.
export const isCodeLocked = (delivery) =>
  delivery.status === "PICKED_UP" && delivery.codeAttempts >= DELIVERY_RULES.maxCodeAttempts;

// "I've received my food" [AC-DEL-06, AC-DEL-07]: after the code locked, the customer (whom
// the code protects) can finish the delivery themselves instead of waiting for an admin.
// Locks the delivery, then the order, like every delivery path.
export const customerConfirmReceived = async ({
  customerId,
  orderId,
  ipAddress,
  now = new Date(),
}) => {
  const riderProfileId = await retryOnDeadlock(() =>
    sequelize.transaction(async (transaction) => {
      const delivery = await findDeliveryForOrderForUpdate(orderId, transaction);
      const order = await lockOrder(orderId, transaction);
      if (!order || order.customerId !== customerId) {
        throw new AppError(404, "NOT_FOUND", "Order not found");
      }
      if (!delivery || !isCodeLocked(delivery)) {
        throw new AppError(
          409,
          "CODE_NOT_LOCKED",
          "Give your rider the 4-digit code to finish the delivery",
        );
      }

      await updateDelivery(delivery, { status: "DELIVERED", deliveredAt: now }, transaction);
      await changeOrderStatus({
        orderId,
        toStatus: "DELIVERED",
        actor: { userId: customerId, role: "CUSTOMER" },
        reason: "The customer confirmed they received the food (delivery code locked)",
        isAllowedFor: () => true, // checked above: their own order
        onlyIfStatus: "PICKED_UP",
        transaction,
      });
      await saveAuditLog(
        {
          actorId: customerId,
          action: "DELIVERY_CONFIRMED_BY_CUSTOMER",
          targetType: "order",
          targetId: orderId,
          before: { codeAttempts: delivery.codeAttempts },
          after: { status: "DELIVERED" },
          reason: "Delivery code locked",
          ipAddress,
        },
        transaction,
      );
      return delivery.riderProfileId;
    }),
  );

  // The rider's screen shows "Delivered", and they are free for the next offer
  const rider = await findRiderProfileById(riderProfileId);
  emitToUser(rider.userId, "delivery:completed", { orderId, confirmedBy: "CUSTOMER" });
  return { orderId, delivered: true };
};

// Every minute: codes locked for 15 minutes with nobody acting get a second admin alert,
// once per lock (Step 12 turns this into an SMS to the admin on duty) [AC-DEL-06]
export const sweepLockedDeliveryCodes = async (now = new Date()) => {
  const lockedBefore = new Date(now.getTime() - DELIVERY_RULES.codeLockReminderAfterMs);
  const stuck = await findDeliveriesLockedSince(lockedBefore);
  for (const delivery of stuck) {
    await updateDelivery(delivery, { codeLockRemindedAt: now });
    emitAdminAlert("DELIVERY_CODE_STILL_LOCKED", {
      orderId: delivery.orderId,
      riderProfileId: delivery.riderProfileId,
      lockedAt: delivery.codeLockedAt,
    });
  }
  return { reminded: stuck.length };
};
