import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";

export const RIDER_DOCUMENT_TYPES = ["GHANA_CARD", "DRIVERS_LICENCE"];

// A private identity file; only admins see it, through a short-lived link [AC-IMG-03]
const RiderDocument = sequelize.define(
  "RiderDocument",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    riderProfileId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    documentType: {
      type: DataTypes.ENUM(...RIDER_DOCUMENT_TYPES),
      allowNull: false,
    },
    publicId: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    format: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
  },
  {
    tableName: "rider_documents",
  },
);

export default RiderDocument;
