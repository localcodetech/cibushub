"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("restaurant_opening_hours", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      restaurant_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "restaurants",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      day_of_week: {
        type: Sequelize.TINYINT.UNSIGNED,
        allowNull: false,
      },
      is_closed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      opens_at: {
        type: Sequelize.TIME,
        allowNull: true,
      },
      closes_at: {
        type: Sequelize.TIME,
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
    });

    await queryInterface.addIndex("restaurant_opening_hours", ["restaurant_id", "day_of_week"], {
      unique: true,
      name: "opening_hours_one_row_per_day",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("restaurant_opening_hours");
  },
};
