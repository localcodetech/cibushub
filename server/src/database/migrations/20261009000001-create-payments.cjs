"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // One row per payment attempt, so retries and failures are all on record [AC-PAY-14]
    await queryInterface.createTable("payments", {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      order_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "orders", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      provider: {
        type: Sequelize.ENUM("PAYSTACK"),
        allowNull: false,
        defaultValue: "PAYSTACK",
      },
      // Our own unique name for this attempt; Paystack sends it back in webhooks
      reference: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      amount_pesewas: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: "GHS" },
      status: {
        type: Sequelize.ENUM("PENDING", "SUCCESS", "FAILED", "ABANDONED", "AMOUNT_MISMATCH"),
        allowNull: false,
        defaultValue: "PENDING",
      },
      // card or mobile_money, filled in once Paystack tells us
      channel: { type: Sequelize.STRING(30), allowNull: true },
      authorization_url: { type: Sequelize.STRING(500), allowNull: true },
      access_code: { type: Sequelize.STRING(100), allowNull: true },
      provider_transaction_id: { type: Sequelize.STRING(50), allowNull: true },
      // What Paystack said when verifying, e.g. "Approved" or "Declined"
      gateway_response: { type: Sequelize.STRING(255), allowNull: true },
      paid_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex("payments", ["order_id", "created_at"]);
    await queryInterface.addIndex("payments", ["status", "created_at"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("payments");
  },
};
