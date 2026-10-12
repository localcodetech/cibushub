import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";

// One version of the platform settings [AC-SADM-02]. Rows are only ever added.
const PlatformSetting = sequelize.define(
  "PlatformSetting",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    values: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    changedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    reason: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
  },
  { tableName: "platform_settings" },
);

export default PlatformSetting;
