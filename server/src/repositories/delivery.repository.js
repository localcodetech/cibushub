import { Op } from "sequelize";
import { Delivery, DeliveryOffer } from "../models/index.js";
import { ACTIVE_DELIVERY_STATUSES } from "../models/delivery/delivery.model.js";

export const findDeliveryByOrderId = (orderId, transaction) => {
  return Delivery.findOne({ where: { orderId }, transaction });
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
