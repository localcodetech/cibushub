import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";

// One message in a user's in-app notification centre [AC-NOTIF-07]
const Notification = sequelize.define(
  "Notification",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING(60),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    body: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    link: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    dedupeKey: {
      type: DataTypes.STRING(191),
      allowNull: true,
      unique: true,
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "notifications",
    // The key is for the server only; the app never needs it
    defaultScope: { attributes: { exclude: ["dedupeKey"] } },
  },
);

export default Notification;
