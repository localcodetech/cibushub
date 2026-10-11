"use strict";

// Problems at the door, and food going back to the restaurant (decided 2026-10-11, ADR 003):
// the rider reports why they can't hand over, waits 10 minutes, then (if nobody acts) the
// order is cancelled with no refund and the rider RETURNS the food, earning 1.5x the fee.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("deliveries", "status", {
      type: Sequelize.ENUM(
        "SEARCHING",
        "ASSIGNED",
        "PICKED_UP",
        "RETURNING",
        "DELIVERED",
        "FAILED",
        "CANCELLED",
      ),
      allowNull: false,
      defaultValue: "SEARCHING",
    });

    // Not only "unreachable" any more: the report has a type
    await queryInterface.renameColumn(
      "deliveries",
      "unreachable_reported_at",
      "problem_reported_at",
    );
    await queryInterface.addColumn("deliveries", "problem_type", {
      type: Sequelize.ENUM("UNREACHABLE", "NOT_AT_ADDRESS", "REFUSED_CODE"),
      allowNull: true,
      after: "problem_reported_at",
    });
    await queryInterface.addColumn("deliveries", "wait_ends_at", {
      type: Sequelize.DATE,
      allowNull: true,
      after: "problem_type",
    });

    // The way back
    await queryInterface.addColumn("deliveries", "returned_at", {
      type: Sequelize.DATE,
      allowNull: true,
      after: "failed_at",
    });
    await queryInterface.addColumn("deliveries", "return_distance_metres", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "returned_at",
    });
    await queryInterface.addColumn("deliveries", "return_flagged", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      after: "return_distance_metres",
    });

    // What the rider actually earned for this delivery, and when it was settled.
    // Usually the order's frozen rider earnings; 1.5x for a returned delivery.
    await queryInterface.addColumn("deliveries", "rider_payout_pesewas", {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: "return_flagged",
    });
    await queryInterface.addColumn("deliveries", "settled_at", {
      type: Sequelize.DATE,
      allowNull: true,
      after: "rider_payout_pesewas",
    });
    await queryInterface.addIndex("deliveries", ["rider_profile_id", "settled_at"], {
      name: "deliveries_rider_settled_at",
    });

    // Deliveries already finished: their payout was the order's rider earnings
    await queryInterface.sequelize.query(`
      UPDATE deliveries d
      JOIN orders o ON o.id = d.order_id
      SET d.rider_payout_pesewas = o.rider_earnings_pesewas, d.settled_at = d.delivered_at
      WHERE d.status = 'DELIVERED'
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex("deliveries", "deliveries_rider_settled_at");
    await queryInterface.removeColumn("deliveries", "settled_at");
    await queryInterface.removeColumn("deliveries", "rider_payout_pesewas");
    await queryInterface.removeColumn("deliveries", "return_flagged");
    await queryInterface.removeColumn("deliveries", "return_distance_metres");
    await queryInterface.removeColumn("deliveries", "returned_at");
    await queryInterface.removeColumn("deliveries", "wait_ends_at");
    await queryInterface.removeColumn("deliveries", "problem_type");
    await queryInterface.renameColumn(
      "deliveries",
      "problem_reported_at",
      "unreachable_reported_at",
    );
    await queryInterface.sequelize.query(
      "UPDATE deliveries SET status = 'FAILED' WHERE status = 'RETURNING'",
    );
    await queryInterface.changeColumn("deliveries", "status", {
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
    });
  },
};
