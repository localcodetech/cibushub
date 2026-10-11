import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";

export const NOTIFICATION_CHANNELS = ["EMAIL", "SMS"];
export const NOTIFICATION_STATUSES = ["QUEUED", "SENT", "FAILED"];

// One email or SMS and how it went [AC-NOTIF-08]. Never the message text itself.
const NotificationLog = sequelize.define(
  "NotificationLog",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    channel: {
      type: DataTypes.ENUM(...NOTIFICATION_CHANNELS),
      allowNull: false,
    },
    template: {
      type: DataTypes.STRING(60),
      allowNull: false,
    },
    dedupeKey: {
      type: DataTypes.STRING(191),
      allowNull: true,
      unique: true,
    },
    recipientMasked: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(...NOTIFICATION_STATUSES),
      allowNull: false,
      defaultValue: "QUEUED",
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    providerMessageId: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    lastError: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  { tableName: "notification_logs" },
);

export default NotificationLog;
