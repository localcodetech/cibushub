import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";

export const RESTAURANT_STATUSES = ["PENDING_APPROVAL", "APPROVED", "REJECTED", "SUSPENDED"];

const Restaurant = sequelize.define(
  "Restaurant",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    ownerId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    legalName: {
      type: DataTypes.STRING(160),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    cuisineTags: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    addressLine: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    area: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    city: {
      type: DataTypes.STRING(80),
      allowNull: false,
      defaultValue: "Kumasi",
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: false,
      get() {
        return Number(this.getDataValue("latitude"));
      },
    },
    longitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: false,
      get() {
        return Number(this.getDataValue("longitude"));
      },
    },
    logoUrl: {
      type: DataTypes.STRING(500),
    },
    logoPublicId: {
      type: DataTypes.STRING(255),
    },
    coverImageUrl: {
      type: DataTypes.STRING(500),
    },
    coverImagePublicId: {
      type: DataTypes.STRING(255),
    },
    status: {
      type: DataTypes.ENUM(...RESTAURANT_STATUSES),
      allowNull: false,
      defaultValue: "PENDING_APPROVAL",
    },
    rejectionReason: {
      type: DataTypes.TEXT,
    },
    isAcceptingOrders: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    minOrderPesewas: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    deliveryRadiusKm: {
      type: DataTypes.DECIMAL(4, 1),
      allowNull: false,
      defaultValue: 5.0,
      get() {
        return Number(this.getDataValue("deliveryRadiusKm"));
      },
    },
    prepTimeMinutes: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 20,
    },
    approvedAt: {
      type: DataTypes.DATE,
    },
  },
  {
    tableName: "restaurants",
    paranoid: true,
  },
);

export default Restaurant;
