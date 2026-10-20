import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";

export const DOCUMENT_TYPES = [
  "BUSINESS_REGISTRATION",
  "FDA_CERTIFICATE",
  "GHANA_CARD",
  "OPERATING_LICENCE",
  "TAX_CERTIFICATE",
];

// A restaurant can only be approved once an admin has VERIFIED both of these
export const REQUIRED_DOCUMENT_TYPES = ["BUSINESS_REGISTRATION", "TAX_CERTIFICATE"];

// PENDING: uploaded, not checked yet. A new upload always starts again at PENDING.
export const VERIFICATION_STATUSES = ["PENDING", "VERIFIED", "REJECTED"];

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
    verificationStatus: {
      type: DataTypes.ENUM(...VERIFICATION_STATUSES),
      allowNull: false,
      defaultValue: "PENDING",
    },
    // Why the admin rejected it, shown to the owner so they know what to fix
    rejectionReason: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    reviewedBy: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "restaurant_documents",
  },
);

export default RestaurantDocument;
