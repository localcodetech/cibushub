"use strict";

// Sign in with Facebook: one more provider a CibusHub account can be linked to
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("oauth_accounts", "provider", {
      type: Sequelize.ENUM("GOOGLE", "APPLE", "FACEBOOK"),
      allowNull: false,
    });
  },

  // Facebook links must go first, or MySQL can't shrink the list
  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("oauth_accounts", { provider: "FACEBOOK" });
    await queryInterface.changeColumn("oauth_accounts", "provider", {
      type: Sequelize.ENUM("GOOGLE", "APPLE"),
      allowNull: false,
    });
  },
};
