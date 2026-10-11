import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";

export const DELIVERY_STATUSES = [
  "SEARCHING",
  "ASSIGNED",
  "PICKED_UP",
  // The order was cancelled after pickup: the rider takes the food back to the restaurant
  "RETURNING",
  "DELIVERED",
  "FAILED",
  "CANCELLED",
];

// A rider holds at most one of these at a time [AC-RIDER-06]
export const ACTIVE_DELIVERY_STATUSES = ["ASSIGNED", "PICKED_UP", "RETURNING"];

// Why the rider can't hand the food over [AC-DEL-08]
export const DOOR_PROBLEMS = ["UNREACHABLE", "NOT_AT_ADDRESS", "REFUSED_CODE"];

// The delivery facts of one order, kept apart from the order status (plan-review C9, C15).
// The order says what the customer sees; the delivery says who carries it and how it went.
const Delivery = sequelize.define(
  "Delivery",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    riderProfileId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...DELIVERY_STATUSES),
      allowNull: false,
      defaultValue: "SEARCHING",
    },
    searchRadiusKm: {
      type: DataTypes.DECIMAL(4, 1),
      allowNull: false,
      // MySQL DECIMAL comes back as text: give the code a number
      get() {
        const value = this.getDataValue("searchRadiusKm");
        return value === null ? null : Number(value);
      },
    },
    searchStartedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    radiusWidenedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    adminsAlertedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    assignedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    pickedUpAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    pickupDistanceMetres: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    pickupFlagged: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    codeAttempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    // 5 wrong codes: when it locked, and when admins were reminded (15 minutes later)
    codeLockedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    codeLockRemindedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // The rider's taps on "Call" during the drop-off, counted by the server [AC-DEL-08]
    callAttempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    lastCallAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    deliveredAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // A problem at the door: when, which, until when the rider waits, and where they were
    problemReportedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    problemType: {
      type: DataTypes.ENUM(...DOOR_PROBLEMS),
      allowNull: true,
    },
    waitEndsAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    reportedLatitude: {
      type: DataTypes.DECIMAL(9, 6),
      allowNull: true,
    },
    reportedLongitude: {
      type: DataTypes.DECIMAL(9, 6),
      allowNull: true,
    },
    failedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // The way back to the restaurant
    returnedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    returnDistanceMetres: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    returnFlagged: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    // What the rider earned for it, and when that was settled [AC-RIDER-07]
    riderPayoutPesewas: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    settledAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    failureReason: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "deliveries",
  },
);

export default Delivery;
