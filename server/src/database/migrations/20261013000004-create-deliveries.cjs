"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // The delivery facts of one order, kept apart from the order status (plan-review C9, C15)
    await queryInterface.createTable("deliveries", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      order_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: "orders",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      // Empty while searching; the rider who accepted after that
      rider_profile_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "rider_profiles",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      status: {
        type: Sequelize.ENUM(
          "SEARCHING",
          "ASSIGNED",
          "PICKED_UP",
          "DELIVERED",
          "FAILED",
          "CANCELLED",
        ),
        allowNull: false,
        defaultValue: "SEARCHING",
      },
      // The search for a rider [AC-ASSIGN-02, AC-ASSIGN-06]
      search_radius_km: {
        type: Sequelize.DECIMAL(4, 1),
        allowNull: false,
      },
      search_started_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      radius_widened_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      admins_alerted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      assigned_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      // Pickup [AC-DEL-02, AC-DEL-03]: how far from the restaurant the rider was
      picked_up_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      pickup_distance_metres: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      pickup_flagged: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      // Drop-off [AC-DEL-06, AC-DEL-07]: only a hash of the 4-digit code is kept
      delivery_code_hash: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      code_attempts: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      delivered_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      // Failed delivery [AC-DEL-08]
      failed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      failure_reason: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      cancelled_at: {
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
    });

    // "Deliveries still looking for a rider" and "this rider's active delivery"
    await queryInterface.addIndex("deliveries", ["status", "search_started_at"], {
      name: "deliveries_status_search",
    });
    await queryInterface.addIndex("deliveries", ["rider_profile_id", "status"], {
      name: "deliveries_rider_status",
    });

    // Every time a rider is asked to take a delivery (plan-review §2, AC-ASSIGN-03, 04)
    await queryInterface.createTable("delivery_offers", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      delivery_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "deliveries",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
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
      // How far the rider was from the restaurant when asked
      pickup_distance_metres: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      offered_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      responded_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      // SUPERSEDED: the delivery was taken or cancelled before this rider answered
      outcome: {
        type: Sequelize.ENUM("PENDING", "ACCEPTED", "DECLINED", "EXPIRED", "SUPERSEDED"),
        allowNull: false,
        defaultValue: "PENDING",
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

    // The same rider is never asked twice for the same delivery [AC-ASSIGN-04]
    await queryInterface.addIndex("delivery_offers", ["delivery_id", "rider_profile_id"], {
      unique: true,
      name: "delivery_offers_once_per_rider",
    });
    // "Does this rider have an offer waiting?"
    await queryInterface.addIndex("delivery_offers", ["rider_profile_id", "outcome"], {
      name: "delivery_offers_rider_outcome",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("delivery_offers");
    await queryInterface.dropTable("deliveries");
  },
};
