import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";

// "Protein: choose 1" → minSelect 1, maxSelect 1 (required)
// "Extras: up to 3"   → minSelect 0, maxSelect 3 (optional)
const OptionGroup = sequelize.define(
  "OptionGroup",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    menuItemId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    minSelect: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    maxSelect: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
    },
    displayOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "menu_option_groups",
  },
);

export default OptionGroup;
