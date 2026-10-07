import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";

export const REFUND_STATUSES = ["PENDING", "PROCESSED", "FAILED"];

// Money going back to a customer [AC-CANC-04]
const Refund = sequelize.define(
  "Refund",
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
    paymentId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    amountPesewas: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    reason: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    initiatedByUserId: {
      type: DataTypes.UUID,
    },
    initiatedByRole: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...REFUND_STATUSES),
      allowNull: false,
      defaultValue: "PENDING",
    },
    providerRefundId: {
      type: DataTypes.STRING(50),
    },
    failureReason: {
      type: DataTypes.STRING(255),
    },
    processedAt: {
      type: DataTypes.DATE,
    },
  },
  {
    tableName: "refunds",
  },
);

export default Refund;
