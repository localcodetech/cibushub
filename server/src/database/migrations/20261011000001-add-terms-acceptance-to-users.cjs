"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // When the user accepted the Terms and Privacy Policy at sign-up, and which version
    // (Ghana Data Protection Act, 2012 (Act 843); docs/plan-review.md §3)
    await queryInterface.addColumn("users", "terms_accepted_at", {
      type: Sequelize.DATE,
      allowNull: true,
      after: "last_login_at",
    });
    await queryInterface.addColumn("users", "terms_version", {
      type: Sequelize.STRING(20),
      allowNull: true,
      after: "terms_accepted_at",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("users", "terms_version");
    await queryInterface.removeColumn("users", "terms_accepted_at");
  },
};
