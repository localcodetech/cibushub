import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";

// [AC-ORD-01]
export const ORDER_STATUSES = [
  "PENDING_PAYMENT",
  "PAID",
  "ACCEPTED",
  "REJECTED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "RIDER_ASSIGNED",
  "PICKED_UP",
  "DELIVERED",
  "CANCELLED",
];

export const PAYMENT_METHODS = ["PAYSTACK", "CASH"];
export const PAYMENT_STATUSES = ["UNPAID", "PAID", "REFUNDED", "PARTIALLY_REFUNDED"];

export const EARNINGS_FIELDS = [
  "commissionPercent",
  "commissionPesewas",
  "restaurantEarningsPesewas",
  "riderEarningsPesewas",
];

// DECIMAL columns come back from MySQL as text; turn them into numbers
const asNumber = (column) => ({
  get() {
    return Number(this.getDataValue(column));
  },
});

const Order = sequelize.define(
  "Order",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    orderNumber: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },
    customerId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    restaurantId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...ORDER_STATUSES),
      allowNull: false,
      defaultValue: "PENDING_PAYMENT",
    },
    paymentMethod: {
      type: DataTypes.ENUM(...PAYMENT_METHODS),
      allowNull: false,
      defaultValue: "PAYSTACK",
    },
    paymentStatus: {
      type: DataTypes.ENUM(...PAYMENT_STATUSES),
      allowNull: false,
      defaultValue: "UNPAID",
    },
    subtotalPesewas: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    deliveryFeePesewas: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    serviceFeePesewas: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    discountPesewas: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    totalPesewas: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    // Who gets what, frozen when the order is placed (utils/order/earnings.js)
    commissionPercent: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
    },
    commissionPesewas: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    restaurantEarningsPesewas: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    riderEarningsPesewas: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    deliveryDistanceMeters: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    pricingSnapshot: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    deliveryLabel: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    deliveryLatitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: false,
      ...asNumber("deliveryLatitude"),
    },
    deliveryLongitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: false,
      ...asNumber("deliveryLongitude"),
    },
    deliveryGhanaPostGps: {
      type: DataTypes.STRING(15),
    },
    deliveryArea: {
      type: DataTypes.STRING(100),
    },
    deliveryLandmark: {
      type: DataTypes.STRING(255),
    },
    contactPhone: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    restaurantNote: {
      type: DataTypes.STRING(500),
    },
    riderNote: {
      type: DataTypes.STRING(500),
    },
    idempotencyKey: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    cancellationReason: {
      type: DataTypes.STRING(500),
    },
  },
  {
    tableName: "orders",
    // Customers never see the money split; owner, rider and admin queries ask for it with
    // Order.scope("withEarnings")
    defaultScope: {
      attributes: { exclude: EARNINGS_FIELDS },
    },
    scopes: {
      withEarnings: {},
    },
  },
);

export default Order;
