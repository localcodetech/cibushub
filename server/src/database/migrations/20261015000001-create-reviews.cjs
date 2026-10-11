"use strict";

// Reviews [AC-REV-01 to 04]: one per delivered order, written by the customer who placed it.
// Restaurants and riders keep a running total and count of their ratings, so the average
// (total / count) is exact and quick to show [AC-REV-04].
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("reviews", {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      // One review per order: the unique key stops a second one, even at the same moment
      order_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: { model: "orders", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      customer_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      restaurant_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "restaurants", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      // The rider who delivered it, if the customer rated them
      rider_profile_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "rider_profiles", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      // 1 to 5 stars for the restaurant (required)
      rating: { type: Sequelize.TINYINT.UNSIGNED, allowNull: false },
      // 1 to 5 stars for the rider (optional)
      rider_rating: { type: Sequelize.TINYINT.UNSIGNED, allowNull: true },
      // Plain text, at most 500 characters; shown as text, never as HTML [AC-REV-08]
      comment: { type: Sequelize.STRING(500), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    // A restaurant's reviews, newest first [AC-REV-05]
    await queryInterface.addIndex("reviews", ["restaurant_id", "created_at"], {
      name: "reviews_restaurant_created",
    });

    await queryInterface.addColumn("restaurants", "rating_total", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn("restaurants", "review_count", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn("rider_profiles", "rating_total", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn("rider_profiles", "rating_count", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("rider_profiles", "rating_count");
    await queryInterface.removeColumn("rider_profiles", "rating_total");
    await queryInterface.removeColumn("restaurants", "review_count");
    await queryInterface.removeColumn("restaurants", "rating_total");
    await queryInterface.dropTable("reviews");
  },
};
