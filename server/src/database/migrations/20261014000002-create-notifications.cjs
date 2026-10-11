"use strict";

// The in-app notification centre [AC-NOTIF-07]: one row per message shown to one user,
// e.g. "Order CH-… was accepted". read_at stays empty until they read it.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("notifications", {
      id: {
        type: Sequelize.BIGINT,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      // What kind of event, e.g. "order.accepted", so the app can pick an icon
      type: {
        type: Sequelize.STRING(60),
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      body: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      // Where tapping it goes in the app, e.g. "/customer/orders/<id>"
      link: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      // e.g. "order:<id>:status:ACCEPTED:in-app": the same event is shown once [AC-NOTIF-04]
      dedupe_key: {
        type: Sequelize.STRING(191),
        allowNull: true,
        unique: true,
      },
      read_at: {
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
    // "My newest notifications" and "how many are unread" both start from the user
    await queryInterface.addIndex("notifications", ["user_id", "created_at"], {
      name: "notifications_user_created",
    });
    await queryInterface.addIndex("notifications", ["user_id", "read_at"], {
      name: "notifications_user_read",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("notifications");
  },
};
