"use strict";

// The restaurant's one public answer to a review [AC-REV-06]
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("reviews", "owner_reply", {
      type: Sequelize.STRING(500),
      allowNull: true,
      after: "comment",
    });
    await queryInterface.addColumn("reviews", "owner_replied_at", {
      type: Sequelize.DATE,
      allowNull: true,
      after: "owner_reply",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("reviews", "owner_replied_at");
    await queryInterface.removeColumn("reviews", "owner_reply");
  },
};
