"use strict";

// Restaurant documents get a tax certificate type and an admin check on each file:
// PENDING (just uploaded) → VERIFIED or REJECTED (with a reason the owner can read)
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("restaurant_documents", "document_type", {
      type: Sequelize.ENUM(
        "BUSINESS_REGISTRATION",
        "FDA_CERTIFICATE",
        "GHANA_CARD",
        "OPERATING_LICENCE",
        "TAX_CERTIFICATE",
      ),
      allowNull: false,
    });
    await queryInterface.addColumn("restaurant_documents", "verification_status", {
      type: Sequelize.ENUM("PENDING", "VERIFIED", "REJECTED"),
      allowNull: false,
      defaultValue: "PENDING",
      after: "format",
    });
    await queryInterface.addColumn("restaurant_documents", "rejection_reason", {
      type: Sequelize.STRING(500),
      allowNull: true,
      after: "verification_status",
    });
    // Which admin checked it, and when; the admin row may go, the history stays
    await queryInterface.addColumn("restaurant_documents", "reviewed_by", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
      after: "rejection_reason",
    });
    await queryInterface.addColumn("restaurant_documents", "reviewed_at", {
      type: Sequelize.DATE,
      allowNull: true,
      after: "reviewed_by",
    });
  },

  // Tax certificates must go first, or MySQL can't shrink the list
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("restaurant_documents", "reviewed_at");
    await queryInterface.removeColumn("restaurant_documents", "reviewed_by");
    await queryInterface.removeColumn("restaurant_documents", "rejection_reason");
    await queryInterface.removeColumn("restaurant_documents", "verification_status");
    await queryInterface.bulkDelete("restaurant_documents", { document_type: "TAX_CERTIFICATE" });
    await queryInterface.changeColumn("restaurant_documents", "document_type", {
      type: Sequelize.ENUM(
        "BUSINESS_REGISTRATION",
        "FDA_CERTIFICATE",
        "GHANA_CARD",
        "OPERATING_LICENCE",
      ),
      allowNull: false,
    });
  },
};
