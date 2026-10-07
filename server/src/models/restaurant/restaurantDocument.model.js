import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";

export const DOCUMENT_TYPES = [
  "BUSINESS_REGISTRATION",
  "FDA_CERTIFICATE",
  "GHANA_CARD",
  "OPERATING_LICENCE",
];

// A private verification file; only admins see it, through a short-lived link [AC-IMG-03]
const RestaurantDocument = sequelize.define(
  "RestaurantDocument",
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
    documentType: {
      type: DataTypes.ENUM(...DOCUMENT_TYPES),
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
    tableName: "restaurant_documents",
  },
);

export default RestaurantDocument;
