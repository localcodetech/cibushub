import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";

export const MENU_ITEM_TAGS = ["spicy", "vegetarian", "vegan", "contains_nuts", "halal"];

const MenuItem = sequelize.define(
  "MenuItem",
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
    categoryId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    pricePesewas: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      validate: {
        min: 1,
      },
    },
    imageUrl: {
      type: DataTypes.STRING(500),
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    isAvailable: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    dailyStock: {
      type: DataTypes.INTEGER.UNSIGNED,
    },
    stockRemaining: {
      type: DataTypes.INTEGER.UNSIGNED,
    },
    displayOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "menu_items",
    paranoid: true,
  },
);

export default MenuItem;
