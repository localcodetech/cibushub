"use strict";

// Platform settings, versioned [AC-SADM-02, AC-SADM-03, plan-review C14]. Each change adds a
// new row holding ALL the values; the newest row is the one in force. Old rows are never
// changed, so it is always clear what applied when, who changed it and why.
// Orders keep a copy of the values they were priced with (orders.pricing_snapshot).
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("platform_settings", {
      // The version number: 1, 2, 3...
      id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },
      values: { type: Sequelize.JSON, allowNull: false },
      // Who made this version (empty for the starting values)
      changed_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      reason: { type: Sequelize.STRING(500), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // Version 1: the values the app used until now (a frozen copy, like every migration)
    const now = new Date();
    await queryInterface.bulkInsert("platform_settings", [
      {
        values: JSON.stringify({
          deliveryBasePesewas: 500,
          deliveryPerKmPesewas: 200,
          serviceFeePesewas: 0,
          commissionPercent: 10,
          searchRadiusKm: 5,
          widenedRadiusKm: 10,
          offerSeconds: 60,
          restaurantResponseMinutes: 5,
          unpaidOrderMinutes: 30,
          paymentMethods: ["PAYSTACK"],
        }),
        changed_by: null,
        reason: "Starting values",
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("platform_settings");
  },
};
