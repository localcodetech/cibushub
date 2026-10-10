"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // When the restaurant expects the food to be ready, set when it accepts the order [AC-RORD-03]
    await queryInterface.addColumn("orders", "estimated_ready_at", {
      type: Sequelize.DATE,
      allowNull: true,
      after: "status",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("orders", "estimated_ready_at");
  },
};
