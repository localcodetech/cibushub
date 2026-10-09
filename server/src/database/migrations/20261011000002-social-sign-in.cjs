"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Google / Apple accounts linked to a CibusHub user. One user can link both.
    await queryInterface.createTable("oauth_accounts", {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      provider: { type: Sequelize.ENUM("GOOGLE", "APPLE"), allowNull: false },
      // Google's / Apple's own ID for the person ("sub"). Emails can change; this never does.
      provider_user_id: { type: Sequelize.STRING(255), allowNull: false },
      // The email the provider gave (Apple may give a private relay address)
      email: { type: Sequelize.STRING(255), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("oauth_accounts", ["provider", "provider_user_id"], {
      unique: true,
    });
    await queryInterface.addIndex("oauth_accounts", ["user_id"]);

    // A Google / Apple user has no password until they set one (forgot password)
    await queryInterface.changeColumn("users", "password_hash", {
      type: Sequelize.STRING(255),
      allowNull: true,
    });

    // A Google / Apple user adds their phone after signing in, then verifies it by SMS
    await queryInterface.changeColumn("users", "phone", {
      type: Sequelize.STRING(20),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("oauth_accounts");
    // Fails if some users have no phone or password; remove those users first
    await queryInterface.changeColumn("users", "phone", {
      type: Sequelize.STRING(20),
      allowNull: false,
    });
    await queryInterface.changeColumn("users", "password_hash", {
      type: Sequelize.STRING(255),
      allowNull: false,
    });
  },
};
