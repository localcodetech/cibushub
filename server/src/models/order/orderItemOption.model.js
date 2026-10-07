import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";

// A frozen copy of one chosen option, e.g. "Protein: Fish +500" [AC-CHK-07]
const OrderItemOption = sequelize.define(
  "OrderItemOption",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    orderItemId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    optionId: {
      type: DataTypes.UUID,
    },
    groupName: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    extraPricePesewas: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
  },
  {
    tableName: "order_item_options",
  },
);

export default OrderItemOption;
