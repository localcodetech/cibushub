"use strict";

// Every email and SMS CibusHub sends, one row each [AC-NOTIF-08]: which channel and template,
// to whom (masked), and how it went. The unique dedupe_key stops one event being sent twice
// [AC-NOTIF-04]. The message text itself is never stored (it may hold a one-time code).
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("notification_logs", {
      id: {
        type: Sequelize.BIGINT,
        autoIncrement: true,
        primaryKey: true,
      },
      channel: {
        type: Sequelize.ENUM("EMAIL", "SMS"),
        allowNull: false,
      },
      // What kind of message, e.g. "otp.verify", "refund.started", "receipt"
      template: {
        type: Sequelize.STRING(60),
        allowNull: false,
      },
      // e.g. "refund:<id>:started:sms": the same event never sends twice. Empty = no check.
      dedupe_key: {
        type: Sequelize.STRING(191),
        allowNull: true,
        unique: true,
      },
      recipient_masked: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM("QUEUED", "SENT", "FAILED"),
        allowNull: false,
        defaultValue: "QUEUED",
      },
      attempts: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      provider_message_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      last_error: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      sent_at: {
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
    await queryInterface.addIndex("notification_logs", ["status", "created_at"], {
      name: "notification_logs_status_created",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("notification_logs");
  },
};
