import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const RefreshToken = sequelize.define(
  "RefreshToken",
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
    tokenHash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },
    familyId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    usedAt: {
      type: DataTypes.DATE,
    },
    revokedAt: {
      type: DataTypes.DATE,
    },
    userAgent: {
      type: DataTypes.STRING(255),
    },
    ipAddress: {
      type: DataTypes.STRING(45),
    },
  },
  {
    tableName: "refresh_tokens",
  },
);

export default RefreshToken;
