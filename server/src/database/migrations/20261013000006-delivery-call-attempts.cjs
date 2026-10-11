"use strict";

// "Customer unreachable" [AC-DEL-08]: the rider's calls are counted by the server, and the
// report keeps when and where the rider was, for the admin who decides what happens next.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("deliveries", "call_attempts", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      after: "code_attempts",
    });
    await queryInterface.addColumn("deliveries", "last_call_at", {
      type: Sequelize.DATE,
      allowNull: true,
      after: "call_attempts",
    });
    await queryInterface.addColumn("deliveries", "unreachable_reported_at", {
      type: Sequelize.DATE,
      allowNull: true,
      after: "delivered_at",
    });
    await queryInterface.addColumn("deliveries", "reported_latitude", {
      type: Sequelize.DECIMAL(9, 6),
      allowNull: true,
      after: "unreachable_reported_at",
    });
    await queryInterface.addColumn("deliveries", "reported_longitude", {
      type: Sequelize.DECIMAL(9, 6),
      allowNull: true,
      after: "reported_latitude",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("deliveries", "reported_longitude");
    await queryInterface.removeColumn("deliveries", "reported_latitude");
    await queryInterface.removeColumn("deliveries", "unreachable_reported_at");
    await queryInterface.removeColumn("deliveries", "last_call_at");
    await queryInterface.removeColumn("deliveries", "call_attempts");
  },
};
