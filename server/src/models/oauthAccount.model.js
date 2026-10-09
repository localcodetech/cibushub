import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

// A Google or Apple account linked to a CibusHub user
const OAuthAccount = sequelize.define(
  "OAuthAccount",
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
    provider: {
      type: DataTypes.ENUM("GOOGLE", "APPLE"),
      allowNull: false,
    },
    providerUserId: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
    },
  },
  {
    tableName: "oauth_accounts",
  },
);

export default OAuthAccount;
