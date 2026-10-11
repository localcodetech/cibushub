"use strict";

// May we send this person offers and news [AC-NOTIF-09]? Off unless they say yes
// (Ghana's Data Protection Act asks for consent before direct marketing).
// Order updates, receipts and codes are always sent: they have no switch.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "marketing_opt_in", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      after: "terms_version",
    });
    // When they last said yes or no: our proof of consent
    await queryInterface.addColumn("users", "marketing_opt_in_changed_at", {
      type: Sequelize.DATE,
      allowNull: true,
      after: "marketing_opt_in",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("users", "marketing_opt_in_changed_at");
    await queryInterface.removeColumn("users", "marketing_opt_in");
  },
};
