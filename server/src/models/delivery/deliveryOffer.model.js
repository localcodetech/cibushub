import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";

export const OFFER_OUTCOMES = ["PENDING", "ACCEPTED", "DECLINED", "EXPIRED", "SUPERSEDED"];

// One rider asked to take one delivery [AC-ASSIGN-03, AC-ASSIGN-04].
// The source of truth for "never ask the same rider twice", and proof in disputes.
const DeliveryOffer = sequelize.define(
  "DeliveryOffer",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    deliveryId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    riderProfileId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    pickupDistanceMetres: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    offeredAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    respondedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    outcome: {
      type: DataTypes.ENUM(...OFFER_OUTCOMES),
      allowNull: false,
      defaultValue: "PENDING",
    },
  },
  {
    tableName: "delivery_offers",
  },
);

export default DeliveryOffer;
