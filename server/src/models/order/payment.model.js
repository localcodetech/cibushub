import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";

export const PAYMENT_ATTEMPT_STATUSES = [
  "PENDING",
  "SUCCESS",
  "FAILED",
  "ABANDONED",
  "AMOUNT_MISMATCH",
];

// One payment attempt for an order [AC-PAY-14]
const Payment = sequelize.define(
  "Payment",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    provider: {
      type: DataTypes.ENUM("PAYSTACK"),
      allowNull: false,
      defaultValue: "PAYSTACK",
    },
    reference: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    amountPesewas: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: "GHS",
    },
    status: {
      type: DataTypes.ENUM(...PAYMENT_ATTEMPT_STATUSES),
      allowNull: false,
      defaultValue: "PENDING",
    },
    channel: {
      type: DataTypes.STRING(30),
    },
    authorizationUrl: {
      type: DataTypes.STRING(500),
    },
    accessCode: {
      type: DataTypes.STRING(100),
    },
    providerTransactionId: {
      type: DataTypes.STRING(50),
    },
    gatewayResponse: {
      type: DataTypes.STRING(255),
    },
    paidAt: {
      type: DataTypes.DATE,
    },
  },
  {
    tableName: "payments",
  },
);

export default Payment;
