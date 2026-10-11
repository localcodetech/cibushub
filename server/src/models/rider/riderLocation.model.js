import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";

// Where a rider was, saved at most every 30 seconds, for disputes [AC-RT-06]
const RiderLocation = sequelize.define(
  "RiderLocation",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    riderProfileId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    latitude: {
      type: DataTypes.DECIMAL(9, 6),
      allowNull: false,
    },
    longitude: {
      type: DataTypes.DECIMAL(9, 6),
      allowNull: false,
    },
    accuracyMetres: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    recordedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    tableName: "rider_locations",
  },
);

export default RiderLocation;
