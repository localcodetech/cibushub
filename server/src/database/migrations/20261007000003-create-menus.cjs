"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // ─────────────────────────────────────────────
    // Categories: "Rice Dishes", "Soups", "Drinks"
    // ─────────────────────────────────────────────
    await queryInterface.createTable("menu_categories", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      restaurant_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "restaurants", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      name: {
        type: Sequelize.STRING(80),
        allowNull: false,
      },
      display_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
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

    await queryInterface.addIndex("menu_categories", ["restaurant_id", "display_order"]);

    // ─────────────────────────────────────────────
    // Items: "Jollof with Chicken", price in pesewas
    // ─────────────────────────────────────────────
    await queryInterface.createTable("menu_items", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      restaurant_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "restaurants", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      category_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "menu_categories", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      name: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      price_pesewas: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
      },
      image_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      tags: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      is_available: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      daily_stock: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
      },
      stock_remaining: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
      },
      display_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
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

    await queryInterface.addIndex("menu_items", ["restaurant_id"]);
    await queryInterface.addIndex("menu_items", ["category_id", "display_order"]);
    await queryInterface.addIndex("menu_items", ["name", "description"], {
      type: "FULLTEXT",
      name: "menu_items_search",
    });

    // ─────────────────────────────────────────────
    // Option groups: "Protein" (choose 1), "Extras" (up to 3)
    // ─────────────────────────────────────────────
    await queryInterface.createTable("menu_option_groups", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      menu_item_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "menu_items", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      name: {
        type: Sequelize.STRING(80),
        allowNull: false,
      },
      min_select: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
      },
      max_select: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 1,
      },
      display_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex("menu_option_groups", ["menu_item_id"]);

    // ─────────────────────────────────────────────
    // Options: "Chicken", "Fish" (+500 pesewas)
    // ─────────────────────────────────────────────
    await queryInterface.createTable("menu_options", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      option_group_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "menu_option_groups", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      name: {
        type: Sequelize.STRING(80),
        allowNull: false,
      },
      extra_price_pesewas: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
      },
      is_available: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      display_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex("menu_options", ["option_group_id"]);
  },

  // Drop in reverse order: children before parents
  async down(queryInterface) {
    await queryInterface.dropTable("menu_options");
    await queryInterface.dropTable("menu_option_groups");
    await queryInterface.dropTable("menu_items");
    await queryInterface.dropTable("menu_categories");
  },
};
