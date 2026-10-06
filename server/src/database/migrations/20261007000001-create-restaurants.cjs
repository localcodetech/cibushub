"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("restaurants", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      owner_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      name: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      legal_name: {
        type: Sequelize.STRING(160),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      cuisine_tags: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      address_line: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      area: {
        type: Sequelize.STRING(80),
        allowNull: false,
      },
      city: {
        type: Sequelize.STRING(80),
        allowNull: false,
        defaultValue: "Kumasi",
      },
      latitude: {
        type: Sequelize.DECIMAL(10, 7),
        allowNull: false,
      },
      longitude: {
        type: Sequelize.DECIMAL(10, 7),
        allowNull: false,
      },
      logo_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      cover_image_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM("PENDING_APPROVAL", "APPROVED", "REJECTED", "SUSPENDED"),
        allowNull: false,
        defaultValue: "PENDING_APPROVAL",
      },
      rejection_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      is_accepting_orders: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      min_order_pesewas: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
      },
      delivery_radius_km: {
        type: Sequelize.DECIMAL(4, 1),
        allowNull: false,
        defaultValue: 5.0,
      },
      prep_time_minutes: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 20,
      },
      approved_at: {
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

    await queryInterface.addIndex("restaurants", ["owner_id"]);
    await queryInterface.addIndex("restaurants", ["status"]);
    await queryInterface.addIndex("restaurants", ["name", "description"], {
      type: "FULLTEXT",
      name: "restaurants_search",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("restaurants");
  },
};
