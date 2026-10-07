"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Cloudinary's name for the profile photo, needed to delete it when it is replaced [AC-IMG-04]
    await queryInterface.addColumn("users", "avatar_public_id", {
      type: Sequelize.STRING(255),
      allowNull: true,
      after: "avatar_url",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("users", "avatar_public_id");
  },
};
