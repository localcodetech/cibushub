"use strict";

// The customer must SEE the 4-digit code in the app [AC-DEL-06], so a one-way hash can't work.
// The code is now worked out from the delivery's id with a server secret (never stored),
// so this column is no longer needed.
module.exports = {
  async up(queryInterface) {
    await queryInterface.removeColumn("deliveries", "delivery_code_hash");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn("deliveries", "delivery_code_hash", {
      type: Sequelize.STRING(100),
      allowNull: true,
      after: "pickup_flagged",
    });
  },
};
