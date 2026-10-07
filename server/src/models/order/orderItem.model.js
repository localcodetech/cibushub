import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";

// A frozen copy of one dish as it was when ordered [AC-CHK-07]
const OrderItem = sequelize.define(
  "OrderItem",
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
    menuItemId: {
      type: DataTypes.UUID,
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    basePricePesewas: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    unitPricePesewas: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    lineTotalPesewas: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
  },
  {
    tableName: "order_items",
  },
);

export default OrderItem;
