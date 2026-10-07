import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";
import { ORDER_STATUSES } from "./order.model.js";

// One row per status change: from what, to what, who and why [AC-ORD-04]
const OrderStatusHistory = sequelize.define(
  "OrderStatusHistory",
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
    fromStatus: {
      type: DataTypes.ENUM(...ORDER_STATUSES),
    },
    toStatus: {
      type: DataTypes.ENUM(...ORDER_STATUSES),
      allowNull: false,
    },
    actorUserId: {
      type: DataTypes.UUID,
    },
    // A role such as CUSTOMER, or SYSTEM when no person made the change
    actorRole: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    reason: {
      type: DataTypes.STRING(500),
    },
  },
  {
    tableName: "order_status_history",
  },
);

export default OrderStatusHistory;
