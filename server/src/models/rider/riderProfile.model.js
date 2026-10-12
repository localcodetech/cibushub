import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";

export const VEHICLE_TYPES = ["MOTORBIKE", "BICYCLE", "CAR"];

// Vehicles that need a plate number and a driver's licence [AC-RIDER-01]
export const MOTORISED_VEHICLES = ["MOTORBIKE", "CAR"];

export const RIDER_STATUSES = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED", "SUSPENDED"];

// A rider's application and vehicle [AC-RIDER-01, AC-RIDER-02].
// The rider's name, phone and photo live on their user account.
const RiderProfile = sequelize.define(
  "RiderProfile",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    vehicleType: {
      type: DataTypes.ENUM(...VEHICLE_TYPES),
      allowNull: false,
    },
    plateNumber: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    ghanaCardNumber: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },
    status: {
      type: DataTypes.ENUM(...RIDER_STATUSES),
      allowNull: false,
      defaultValue: "DRAFT",
    },
    // "Send me delivery offers" [AC-RIDER-03]; the live position itself is in Redis
    isOnline: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    wentOnlineAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    rejectionReason: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // The rider's optional stars from reviews: average = total / count [AC-REV-02]
    ratingTotal: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    ratingCount: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "rider_profiles",
  },
);

export default RiderProfile;
