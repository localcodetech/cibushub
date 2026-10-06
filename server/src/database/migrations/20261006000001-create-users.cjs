"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("users", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      full_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true,
      },
      password_hash: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      role: {
        type: Sequelize.ENUM("CUSTOMER", "RESTAURANT_OWNER", "RIDER", "ADMIN", "SUPER_ADMIN"),
        allowNull: false,
        defaultValue: "CUSTOMER",
      },
      status: {
        type: Sequelize.ENUM("PENDING_VERIFICATION", "PENDING_APPROVAL", "ACTIVE", "SUSPENDED"),
        allowNull: false,
        defaultValue: "PENDING_VERIFICATION",
      },
      email_verified_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      phone_verified_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      avatar_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      last_login_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("users");
  },
};
