import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Address = sequelize.define(
  "Address",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    label: {
      type: DataTypes.ENUM("HOME", "WORK", "OTHER"),
      allowNull: false,
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: false,
      get() {
        return Number(this.getDataValue("latitude"));
      },
    },
    longitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: false,
      get() {
        return Number(this.getDataValue("longitude"));
      },
    },
    ghanaPostGps: {
      type: DataTypes.STRING(15),
    },
    area: {
      type: DataTypes.STRING(100),
    },
    landmark: {
      type: DataTypes.STRING(255),
    },
    deliveryInstructions: {
      type: DataTypes.STRING(500),
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    tableName: "addresses",
  },
);

export default Address;
