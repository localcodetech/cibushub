"use strict";

// Admins can hide an abusive review, with a reason [AC-REV-07]. A hidden review is left out
// of the public list and of the restaurant's (and rider's) rating totals.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("reviews", "hidden_at", {
      type: Sequelize.DATE,
      allowNull: true,
      after: "owner_replied_at",
    });
    await queryInterface.addColumn("reviews", "hidden_reason", {
      type: Sequelize.STRING(255),
      allowNull: true,
      after: "hidden_at",
    });
    await queryInterface.addColumn("reviews", "hidden_by", {
      type: Sequelize.UUID,
      allowNull: true,
      after: "hidden_reason",
      references: { model: "users", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("reviews", "hidden_by");
    await queryInterface.removeColumn("reviews", "hidden_reason");
    await queryInterface.removeColumn("reviews", "hidden_at");
  },
};
