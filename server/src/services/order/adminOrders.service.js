import AppError from "../../utils/AppError.js";
import { buildPageMeta, toLimitAndOffset } from "../../utils/pagination.js";
import { normalizeGhanaPhone } from "../../utils/phone.js";
import { nextStatusesFor } from "../../utils/order/orderStateMachine.js";
import { findOrderForAdmin, findOrdersForAdmin } from "../../repositories/order.repository.js";
import {
  findDeliveryForAdmin,
  findOrderLocations,
} from "../../repositories/delivery.repository.js";
import { isCodeLocked } from "../delivery/deliveryFlow.service.js";

const DAY_MS = 24 * 60 * 60 * 1000;
// A delivery path is at most a few hundred points (one every 30 seconds)
const MAX_PATH_POINTS = 500;

// A rider can be changed until pickup (same rule as manualAssignment.service.js)
const ORDER_STATUSES_BEFORE_PICKUP = [
  "ACCEPTED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "RIDER_ASSIGNED",
];

// The usual order of steps. Times are saved to the second, so two quick steps can share
// one; this puts them back in the right order.
const JOURNEY = [
  "PENDING_PAYMENT",
  "PAID",
  "ACCEPTED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "RIDER_ASSIGNED",
  "PICKED_UP",
  "DELIVERED",
  "REJECTED",
  "CANCELLED",
];

const byTimeThenJourney = (first, second) =>
  new Date(first.at) - new Date(second.at) ||
  JOURNEY.indexOf(first.status) - JOURNEY.indexOf(second.status);

// "2026-10-11" -> midnight that day in Ghana (UTC all year)
const startOfDay = (dayText) => new Date(`${dayText}T00:00:00Z`);

// Search, filter and page through every order, newest first [AC-ADM-05]
export const listOrdersForAdmin = async (query) => {
  const { limit, offset } = toLimitAndOffset(query);

  const { rows, count } = await findOrdersForAdmin({
    search: query.q,
    // "024 123 4567" also finds "+233241234567"
    phone: query.q ? normalizeGhanaPhone(query.q) : null,
    status: query.status,
    restaurantId: query.restaurantId,
    from: query.from ? startOfDay(query.from) : null,
    // "to" includes that whole day
    to: query.to ? new Date(startOfDay(query.to).getTime() + DAY_MS) : null,
    limit,
    offset,
  });

  return { orders: rows, meta: buildPageMeta(query, count) };
};

// Everything about one order, and what an admin can still do to it [AC-ADM-05]
export const getOrderForAdmin = async (orderId) => {
  const order = await findOrderForAdmin(orderId);
  if (!order) {
    throw new AppError(404, "NOT_FOUND", "Order not found");
  }

  const [delivery, path] = await Promise.all([
    findDeliveryForAdmin(order.id),
    findOrderLocations(order.id, MAX_PATH_POINTS),
  ]);

  const beforePickup =
    ORDER_STATUSES_BEFORE_PICKUP.includes(order.status) &&
    delivery !== null &&
    ["SEARCHING", "ASSIGNED"].includes(delivery.status);

  return {
    ...order.toJSON(),
    // Who did what and when, with the reason [AC-ORD-06]
    timeline: order.statusHistory
      .map((entry) => ({
        status: entry.toStatus,
        at: entry.createdAt,
        by: entry.actorRole,
        byName: entry.actor ? entry.actor.fullName : null,
        reason: entry.reason,
      }))
      .sort(byTimeThenJourney),
    delivery: delivery
      ? {
          id: delivery.id,
          status: delivery.status,
          searchStartedAt: delivery.searchStartedAt,
          assignedAt: delivery.assignedAt,
          pickedUpAt: delivery.pickedUpAt,
          deliveredAt: delivery.deliveredAt,
          ridersAsked: delivery.offers.length,
          codeAttempts: delivery.codeAttempts,
          codeLocked: isCodeLocked(delivery),
          problemType: delivery.problemType,
          failureReason: delivery.failureReason,
          rider: delivery.rider
            ? {
                id: delivery.rider.id,
                fullName: delivery.rider.user.fullName,
                phone: delivery.rider.user.phone,
                vehicleType: delivery.rider.vehicleType,
                plateNumber: delivery.rider.plateNumber,
              }
            : null,
        }
      : null,
    // The rider's route during this order [AC-ADM-05]
    path: path.map((point) => ({
      latitude: Number(point.latitude),
      longitude: Number(point.longitude),
      at: point.recordedAt,
    })),
    // Which admin buttons to show
    adminActions: {
      canCancel: nextStatusesFor(order.status, "ADMIN").includes("CANCELLED"),
      canChangeRider: beforePickup,
      canUnassignRider: beforePickup && delivery.riderProfileId !== null,
      canUnlockCode: delivery !== null && isCodeLocked(delivery),
    },
  };
};
