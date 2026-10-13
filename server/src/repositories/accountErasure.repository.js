import { Op } from "sequelize";
import sequelize from "../config/database.js";
import {
  Address,
  Delivery,
  Notification,
  OAuthAccount,
  Order,
  RefreshToken,
  Refund,
  RiderDocument,
  RiderLocation,
} from "../models/index.js";
import { TERMINAL_STATUSES } from "../utils/order/orderStateMachine.js";
import { ACTIVE_DELIVERY_STATUSES } from "../models/delivery/delivery.model.js";

// Every query that removes one person's data when they delete their account [AC-CUST-11].
// What is removed and what is kept (and why) is written down in docs/account-deletion.md.

// ─────────────────────────────────────────────
// Checks: nothing still in progress
// ─────────────────────────────────────────────

// Orders not finished yet (waiting for payment, cooking, on the way...)
export const countOpenOrders = (customerId) => {
  return Order.count({ where: { customerId, status: { [Op.notIn]: TERMINAL_STATUSES } } });
};

// Money still on its way back to the customer
export const countPendingRefunds = (customerId) => {
  return Refund.count({
    where: { status: "PENDING" },
    include: [{ model: Order, as: "order", where: { customerId }, attributes: [] }],
  });
};

// A delivery the rider is doing right now
export const countActiveDeliveries = (riderProfileId) => {
  return Delivery.count({
    where: { riderProfileId, status: { [Op.in]: ACTIVE_DELIVERY_STATUSES } },
  });
};

// ─────────────────────────────────────────────
// Removing (all inside the caller's transaction)
// ─────────────────────────────────────────────

// Saved addresses, Google / Apple links, sessions (with their IP and device) and the inbox
export const deleteUserRecords = async (userId, transaction) => {
  await Address.destroy({ where: { userId }, transaction });
  await OAuthAccount.destroy({ where: { userId }, transaction });
  await RefreshToken.destroy({ where: { userId }, transaction });
  await Notification.destroy({ where: { userId }, transaction });
};

// Past orders stay for accounting, without the contact details: no phone, landmark, GPS code
// or notes, and the drop-off point blurred to about 1 km (2 decimal places)
export const anonymiseCustomerOrders = (customerId, transaction) => {
  return Order.update(
    {
      contactPhone: "",
      deliveryLandmark: null,
      deliveryGhanaPostGps: null,
      restaurantNote: null,
      riderNote: null,
      deliveryLatitude: sequelize.literal("ROUND(delivery_latitude, 2)"),
      deliveryLongitude: sequelize.literal("ROUND(delivery_longitude, 2)"),
    },
    { where: { customerId }, transaction },
  );
};

// A rider's trail of positions, and their private documents (the Cloudinary IDs are returned,
// so the files can be deleted after the transaction)
export const deleteRiderRecords = async (riderProfileId, transaction) => {
  await RiderLocation.destroy({ where: { riderProfileId }, transaction });
  const documents = await RiderDocument.findAll({ where: { riderProfileId }, transaction });
  await RiderDocument.destroy({ where: { riderProfileId }, transaction });
  return documents.map((document) => document.publicId);
};
