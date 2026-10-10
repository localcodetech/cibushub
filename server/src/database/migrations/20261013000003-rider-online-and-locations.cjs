"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Online means "send me delivery offers" [AC-RIDER-03]. The live position is in Redis.
    await queryInterface.addColumn("rider_profiles", "is_online", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      after: "status",
    });
    await queryInterface.addColumn("rider_profiles", "went_online_at", {
      type: Sequelize.DATE,
      allowNull: true,
      after: "is_online",
    });

    // Where riders were, at most every 30 seconds, for disputes [AC-RT-06]
    await queryInterface.createTable("rider_locations", {
      id: {
        type: Sequelize.BIGINT,
        autoIncrement: true,
        primaryKey: true,
      },
      rider_profile_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "rider_profiles",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      // Filled in while the rider is on a delivery (Step 11 deliveries)
      order_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "orders",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      latitude: {
        type: Sequelize.DECIMAL(9, 6),
        allowNull: false,
      },
      longitude: {
        type: Sequelize.DECIMAL(9, 6),
        allowNull: false,
      },
      // How sure the phone was, in metres (from the browser)
      accuracy_metres: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      recorded_at: {
        type: Sequelize.DATE,
        allowNull: false,
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

    await queryInterface.addIndex("rider_locations", ["rider_profile_id", "recorded_at"], {
      name: "rider_locations_rider_time",
    });
    await queryInterface.addIndex("rider_locations", ["order_id", "recorded_at"], {
      name: "rider_locations_order_time",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("rider_locations");
    await queryInterface.removeColumn("rider_profiles", "went_online_at");
    await queryInterface.removeColumn("rider_profiles", "is_online");
  },
};
