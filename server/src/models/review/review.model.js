import { DataTypes } from "sequelize";
import sequelize from "../../config/database.js";

// A customer's review of one delivered order [AC-REV-01, AC-REV-02]
const Review = sequelize.define(
  "Review",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    customerId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    restaurantId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    riderProfileId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    rating: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
    },
    riderRating: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: true,
    },
    comment: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
  },
  { tableName: "reviews" },
);

export default Review;
