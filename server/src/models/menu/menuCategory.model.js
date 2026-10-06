import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";

const MenuCategory = sequelize.define(
  "MenuCategory",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    restaurantId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
    displayOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "menu_categories",
    paranoid: true,
  },
);

export default MenuCategory;
