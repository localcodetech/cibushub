"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // One row per refund: written first as PENDING, then sent to Paystack by a job [AC-CANC-04]
    await queryInterface.createTable("refunds", {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      order_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "orders", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      // The successful payment the money goes back to
      payment_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "payments", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      amount_pesewas: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      reason: { type: Sequelize.STRING(500), allowNull: false },
      // Who asked for it; empty when the system did (e.g. money arrived after the order closed)
      initiated_by_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      initiated_by_role: { type: Sequelize.STRING(20), allowNull: false },
      status: {
        type: Sequelize.ENUM("PENDING", "PROCESSED", "FAILED"),
        allowNull: false,
        defaultValue: "PENDING",
      },
      // Paystack's id for the refund, filled in once it has been sent
      provider_refund_id: { type: Sequelize.STRING(50), allowNull: true },
      failure_reason: { type: Sequelize.STRING(255), allowNull: true },
      processed_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex("refunds", ["order_id"]);
    await queryInterface.addIndex("refunds", ["status", "created_at"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("refunds");
  },
};
