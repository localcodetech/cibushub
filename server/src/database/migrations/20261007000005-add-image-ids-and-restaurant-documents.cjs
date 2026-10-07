"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Cloudinary's name for each image, needed to delete the old one when it is replaced
    await queryInterface.addColumn("restaurants", "logo_public_id", {
      type: Sequelize.STRING(255),
      allowNull: true,
      after: "logo_url",
    });
    await queryInterface.addColumn("restaurants", "cover_image_public_id", {
      type: Sequelize.STRING(255),
      allowNull: true,
      after: "cover_image_url",
    });
    await queryInterface.addColumn("menu_items", "image_public_id", {
      type: Sequelize.STRING(255),
      allowNull: true,
      after: "image_url",
    });

    await queryInterface.createTable("restaurant_documents", {
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
      document_type: {
        type: Sequelize.ENUM(
          "BUSINESS_REGISTRATION",
          "FDA_CERTIFICATE",
          "GHANA_CARD",
          "OPERATING_LICENCE",
        ),
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

    // One document of each type per restaurant; a new upload replaces the old one
    await queryInterface.addIndex("restaurant_documents", ["restaurant_id", "document_type"], {
      unique: true,
      name: "restaurant_documents_one_per_type",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("restaurant_documents");
    await queryInterface.removeColumn("menu_items", "image_public_id");
    await queryInterface.removeColumn("restaurants", "cover_image_public_id");
    await queryInterface.removeColumn("restaurants", "logo_public_id");
  },
};
