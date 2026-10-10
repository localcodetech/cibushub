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
  findDeliveryForUpdate,
  updateDelivery,
} from "../../repositories/delivery.repository.js";
import {
  findRiderProfileByUserId,
  lockRiderProfileByUserId,
} from "../../repositories/rider.repository.js";
import { Order, Restaurant, User } from "../../models/index.js";
import { getLatestLocation } from "../rider/riderLocationStore.js";
import { emitAdminAlert } from "../../sockets/emitAdminAlert.js";

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
        await updateDelivery(delivery, { codeAttempts: attempts }, transaction);
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
