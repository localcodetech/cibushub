import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";

const OpeningHours = sequelize.define(
  "OpeningHours",
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
    dayOfWeek: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      validate: {
        min: 0,
        max: 6,
      },
    },
    isClosed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    opensAt: {
      type: DataTypes.TIME,
    },
    closesAt: {
      type: DataTypes.TIME,
    },
  },
  {
    tableName: "restaurant_opening_hours",
  },
);

export default OpeningHours;
