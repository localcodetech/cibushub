"use strict";

const EARNINGS_COLUMNS = [
  "commission_percent",
  "commission_pesewas",
  "restaurant_earnings_pesewas",
  "rider_earnings_pesewas",
];

module.exports = {
  async up(queryInterface, Sequelize) {
    // Who gets what from each order, frozen when it is placed (docs/pricing.md)
    // Added as optional first, so orders that already exist can be filled in below
    await queryInterface.addColumn("orders", "commission_percent", {
      type: Sequelize.TINYINT.UNSIGNED,
      allowNull: true,
      after: "total_pesewas",
    });
    await queryInterface.addColumn("orders", "commission_pesewas", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      after: "commission_percent",
    });
    await queryInterface.addColumn("orders", "restaurant_earnings_pesewas", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      after: "commission_pesewas",
    });
    await queryInterface.addColumn("orders", "rider_earnings_pesewas", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      after: "restaurant_earnings_pesewas",
    });

    // Older orders get today's rules: 10% commission, the whole delivery fee to the rider.
    // ROUND on a whole-number division rounds half up, the same as divideAndRound
    await queryInterface.sequelize.query(`
      UPDATE orders SET
        commission_percent = 10,
        commission_pesewas = ROUND(subtotal_pesewas * 10 / 100),
        restaurant_earnings_pesewas = subtotal_pesewas - ROUND(subtotal_pesewas * 10 / 100),
        rider_earnings_pesewas = delivery_fee_pesewas
    `);

    // Every order has them now, so new orders must always have them too
    await queryInterface.changeColumn("orders", "commission_percent", {
      type: Sequelize.TINYINT.UNSIGNED,
      allowNull: false,
    });
    await queryInterface.changeColumn("orders", "commission_pesewas", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
    });
    await queryInterface.changeColumn("orders", "restaurant_earnings_pesewas", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
    });
    await queryInterface.changeColumn("orders", "rider_earnings_pesewas", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
    });
  },

  async down(queryInterface) {
    for (const column of EARNINGS_COLUMNS) {
      await queryInterface.removeColumn("orders", column);
    }
  },
};
