"use strict";

// When the delivery code locked (5 wrong tries), and when admins were reminded about it.
// After 15 minutes still locked, admins get a second alert (AC-DEL-06; SMS in Step 12).
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("deliveries", "code_locked_at", {
      type: Sequelize.DATE,
      allowNull: true,
      after: "code_attempts",
    });
    await queryInterface.addColumn("deliveries", "code_lock_reminded_at", {
      type: Sequelize.DATE,
      allowNull: true,
      after: "code_locked_at",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("deliveries", "code_lock_reminded_at");
    await queryInterface.removeColumn("deliveries", "code_locked_at");
  },
};
