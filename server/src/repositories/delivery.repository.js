import { Op, fn, col } from "sequelize";
import { Delivery, DeliveryOffer, Order, Restaurant, RiderProfile, User } from "../models/index.js";
import { ACTIVE_DELIVERY_STATUSES } from "../models/delivery/delivery.model.js";

export const findDeliveryById = (deliveryId, transaction) => {
  return Delivery.findByPk(deliveryId, { transaction });
};

export const findDeliveryByOrderId = (orderId, transaction) => {
  return Delivery.findOne({ where: { orderId }, transaction });
};

// An order's delivery, locked (the restaurant marking the food ready)
export const findDeliveryForOrderForUpdate = (orderId, transaction) => {
  return Delivery.findOne({ where: { orderId }, transaction, lock: transaction.LOCK.UPDATE });
};

// One delivery, locked for the rest of the transaction (accepting, picking up, completing)
export const findDeliveryForUpdate = (deliveryId, transaction) => {
  return Delivery.findByPk(deliveryId, { transaction, lock: transaction.LOCK.UPDATE });
};

export const createDelivery = (data, transaction) => {
  return Delivery.create(data, { transaction });
};

export const updateDelivery = (delivery, changes, transaction) => {
  return delivery.update(changes, { transaction });
};

// The delivery a rider is carrying right now, or null [AC-RIDER-06]
export const findActiveDeliveryForRider = (riderProfileId, transaction) => {
  return Delivery.findOne({
    where: { riderProfileId, status: { [Op.in]: ACTIVE_DELIVERY_STATUSES } },
    transaction,
  });
};

export const createOffer = (data, transaction) => {
  return DeliveryOffer.create(data, { transaction });
};

// Riders already asked for this delivery: they are never asked again [AC-ASSIGN-04]
export const findOfferedRiderIds = async (deliveryId, transaction) => {
  const offers = await DeliveryOffer.findAll({
    where: { deliveryId },
    attributes: ["riderProfileId"],
    transaction,
  });
  return offers.map((offer) => offer.riderProfileId);
};

// The offer still waiting for an answer on this delivery, or null
export const findPendingOfferForDelivery = (deliveryId, transaction) => {
  return DeliveryOffer.findOne({ where: { deliveryId, outcome: "PENDING" }, transaction });
};

// Riders among these who are waiting to answer some offer right now
export const findRidersWithPendingOffers = async (riderProfileIds, transaction) => {
  const offers = await DeliveryOffer.findAll({
    where: { riderProfileId: { [Op.in]: riderProfileIds }, outcome: "PENDING" },
    attributes: ["riderProfileId"],
    transaction,
  });
  return offers.map((offer) => offer.riderProfileId);
};

// Riders among these who are carrying a delivery right now [AC-RIDER-06]
export const findRidersOnDeliveries = async (riderProfileIds, transaction) => {
  const deliveries = await Delivery.findAll({
    where: {
      riderProfileId: { [Op.in]: riderProfileIds },
      status: { [Op.in]: ACTIVE_DELIVERY_STATUSES },
    },
    attributes: ["riderProfileId"],
    transaction,
  });
  return deliveries.map((delivery) => delivery.riderProfileId);
};

// A rider's offer, with its delivery, locked (answering it)
export const findOfferForUpdate = (offerId, transaction) => {
  return DeliveryOffer.findByPk(offerId, { transaction, lock: transaction.LOCK.UPDATE });
};

// The offer a rider is looking at right now, if any (the app asks after reconnecting)
export const findPendingOfferForRider = (riderProfileId) => {
  return DeliveryOffer.findOne({
    where: { riderProfileId, outcome: "PENDING" },
    order: [["offeredAt", "DESC"]],
  });
};

export const updateOffer = (offer, changes, transaction) => {
  return offer.update(changes, { transaction });
};

// Every offer still waiting on this delivery becomes SUPERSEDED (taken, or cancelled)
export const supersedePendingOffers = (deliveryId, now, transaction) => {
  return DeliveryOffer.update(
    { outcome: "SUPERSEDED", respondedAt: now },
    { where: { deliveryId, outcome: "PENDING" }, transaction },
  );
};

// Deliveries still looking for a rider, oldest first (the assignment sweep)
export const findSearchingDeliveries = (limit) => {
  return Delivery.findAll({
    where: { status: "SEARCHING" },
    order: [["searchStartedAt", "ASC"]],
    limit,
  });
};

export const findOfferById = (offerId, transaction) => {
  return DeliveryOffer.findByPk(offerId, { transaction });
};

// This rider's other waiting offers (closed when they accept one)
export const findPendingOffersOfRider = (riderProfileId, transaction) => {
  return DeliveryOffer.findAll({ where: { riderProfileId, outcome: "PENDING" }, transaction });
};

// Records that this rider holds this delivery, as an ACCEPTED offer (an admin's pick):
// it keeps the offer history complete, and the rider is never asked for it again
export const recordAcceptedOffer = async (
  { deliveryId, riderProfileId, pickupDistanceMetres, now },
  transaction,
) => {
  const existing = await DeliveryOffer.findOne({
    where: { deliveryId, riderProfileId },
    transaction,
  });
  if (existing) {
    return existing.update({ outcome: "ACCEPTED", respondedAt: now }, { transaction });
  }
  return DeliveryOffer.create(
    {
      deliveryId,
      riderProfileId,
      pickupDistanceMetres,
      offeredAt: now,
      expiresAt: now,
      respondedAt: now,
      outcome: "ACCEPTED",
    },
    { transaction },
  );
};

// A rider's finished deliveries (delivered, or food returned) in a time range, newest first
// [AC-RIDER-07]. Only what the earnings list needs: no customer name, phone or exact address.
const SETTLED_IN = (riderProfileId, from, to) => ({
  riderProfileId,
  riderPayoutPesewas: { [Op.ne]: null },
  settledAt: { [Op.gte]: from, [Op.lt]: to },
});

export const findDeliveredForRider = ({ riderProfileId, from, to, limit, offset }) => {
  return Delivery.findAndCountAll({
    where: SETTLED_IN(riderProfileId, from, to),
    attributes: [
      "id",
      "status",
      "pickedUpAt",
      "deliveredAt",
      "returnedAt",
      "settledAt",
      "riderPayoutPesewas",
    ],
    include: [
      {
        model: Order.unscoped(),
        as: "order",
        attributes: ["id", "orderNumber", "deliveryArea", "deliveryDistanceMeters"],
        include: [{ model: Restaurant, as: "restaurant", attributes: ["name", "area"] }],
      },
    ],
    order: [["settledAt", "DESC"]],
    limit,
    offset,
  });
};

// How many, and how much, for the same range (all pages together)
export const sumRiderEarnings = async ({ riderProfileId, from, to }) => {
  const totals = await Delivery.findOne({
    where: SETTLED_IN(riderProfileId, from, to),
    attributes: [
      [fn("COUNT", col("id")), "deliveryCount"],
      [fn("SUM", col("rider_payout_pesewas")), "earningsPesewas"],
    ],
    raw: true,
  });
  return {
    deliveryCount: Number(totals.deliveryCount || 0),
    earningsPesewas: Number(totals.earningsPesewas || 0),
  };
};

// The rider's delivery in hand with its order's status: is the customer being shown the rider?
export const findActiveDeliveryWithOrder = (riderProfileId) => {
  return Delivery.findOne({
    where: { riderProfileId, status: ACTIVE_DELIVERY_STATUSES },
    include: [{ model: Order.unscoped(), as: "order", attributes: ["id", "status"] }],
  });
};

// For these orders: the deliveries that have a rider, with the rider's name and photo
// (the customer's tracking card and the restaurant's board) [AC-RORD-08]
export const findDeliveriesWithRider = (orderIds) => {
  return Delivery.findAll({
    where: { orderId: orderIds, status: ACTIVE_DELIVERY_STATUSES },
    include: [
      {
        model: RiderProfile,
        as: "rider",
        attributes: ["id", "vehicleType", "plateNumber"],
        include: [{ model: User, as: "user", attributes: ["fullName", "avatarUrl"] }],
      },
    ],
  });
};

// Picked-up deliveries whose code locked before this moment and that admins haven't been
// reminded about yet (the every-minute sweep) [AC-DEL-06]
export const findDeliveriesLockedSince = (lockedBefore) => {
  return Delivery.findAll({
    where: {
      status: "PICKED_UP",
      codeLockedAt: { [Op.lte]: lockedBefore },
      codeLockRemindedAt: null,
    },
    limit: 100,
  });
};

// Picked-up deliveries whose door wait ran out (the every-minute sweep) [AC-DEL-08]
export const findDeliveriesWaitedOut = (now) => {
  return Delivery.findAll({
    where: { status: "PICKED_UP", waitEndsAt: { [Op.lte]: now } },
    attributes: ["id"],
    limit: 100,
  });
};

// Orders of these restaurants whose food is on its way back (the board shows them)
export const findReturningOrderIds = async (restaurantIds) => {
  const rows = await Delivery.findAll({
    where: { status: "RETURNING" },
    attributes: ["orderId"],
    include: [
      {
        model: Order.unscoped(),
        as: "order",
        attributes: [],
        where: { restaurantId: restaurantIds },
      },
    ],
  });
  return rows.map((row) => row.orderId);
};
