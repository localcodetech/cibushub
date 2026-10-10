"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // A rider's application and vehicle [AC-RIDER-01]. One per rider account.
    await queryInterface.createTable("rider_profiles", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      vehicle_type: {
        type: Sequelize.ENUM("MOTORBIKE", "BICYCLE", "CAR"),
        allowNull: false,
      },
      // Only motorbikes and cars have one
      plate_number: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      ghana_card_number: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      // DRAFT while filling in, then PENDING_APPROVAL after "Submit for review"
      status: {
        type: Sequelize.ENUM("DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED", "SUSPENDED"),
        allowNull: false,
        defaultValue: "DRAFT",
      },
      rejection_reason: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      submitted_at: {
        type: Sequelize.DATE,
        allowNull: true,
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
    });

    // The admin review queue: pending riders, oldest first
    await queryInterface.addIndex("rider_profiles", ["status", "submitted_at"], {
      name: "rider_profiles_status_submitted",
    });

    // Private identity documents; only admins see them, through a short-lived link [AC-IMG-03]
    await queryInterface.createTable("rider_documents", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
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
      document_type: {
        type: Sequelize.ENUM("GHANA_CARD", "DRIVERS_LICENCE"),
        allowNull: false,
      },
      public_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      format: {
        type: Sequelize.STRING(10),
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

    // One of each type per rider; a new upload replaces the old one
    await queryInterface.addIndex("rider_documents", ["rider_profile_id", "document_type"], {
      unique: true,
      name: "rider_documents_one_per_type",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("rider_documents");
    await queryInterface.dropTable("rider_profiles");
  },
};
