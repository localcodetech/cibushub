import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    fullName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM("CUSTOMER", "RESTAURANT_OWNER", "RIDER", "ADMIN", "SUPER_ADMIN"),
      allowNull: false,
      defaultValue: "CUSTOMER",
    },
    status: {
      type: DataTypes.ENUM("PENDING_VERIFICATION", "PENDING_APPROVAL", "ACTIVE", "SUSPENDED"),
      allowNull: false,
      defaultValue: "PENDING_VERIFICATION",
    },
    emailVerifiedAt: {
      type: DataTypes.DATE,
    },
    phoneVerifiedAt: {
      type: DataTypes.DATE,
    },
    avatarUrl: {
      type: DataTypes.STRING(500),
    },
    avatarPublicId: {
      type: DataTypes.STRING(255),
    },
    lastLoginAt: {
      type: DataTypes.DATE,
    },
    // Sign-up consent to the Terms and Privacy Policy (Act 843)
    termsAcceptedAt: {
      type: DataTypes.DATE,
    },
    termsVersion: {
      type: DataTypes.STRING(20),
    },
  },
  {
    tableName: "users",
    paranoid: true,
    defaultScope: {
      attributes: { exclude: ["passwordHash"] },
    },
    scopes: {
      withPassword: {
        attributes: { include: ["passwordHash"] },
      },
    },
  },
);

export default User;
