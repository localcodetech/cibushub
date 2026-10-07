"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("audit_logs", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      actor_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      action: {
        type: Sequelize.STRING(60),
        allowNull: false,
      },
      target_type: {
        type: Sequelize.STRING(40),
        allowNull: false,
      },
      target_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      before: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      after: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      ip_address: {
        type: Sequelize.STRING(45),
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

    await queryInterface.addIndex("audit_logs", ["target_type", "target_id"], {
      name: "audit_logs_target",
    });
    await queryInterface.addIndex("audit_logs", ["actor_id", "created_at"], {
      name: "audit_logs_actor_time",
    });
    await queryInterface.addIndex("audit_logs", ["action", "created_at"], {
      name: "audit_logs_action_time",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("audit_logs");
  },
};
