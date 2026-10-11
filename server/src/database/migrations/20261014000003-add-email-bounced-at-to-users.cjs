"use strict";

// Set when Resend tells us an email to this address bounced (the mailbox doesn't exist or
// refuses mail). We then stop sending it ordinary emails until the address is confirmed
// again or changed [AC-NOTIF-08, AC-AUTH-01].
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "email_bounced_at", {
      type: Sequelize.DATE,
      allowNull: true,
      after: "email_verified_at",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("users", "email_bounced_at");
  },
};
