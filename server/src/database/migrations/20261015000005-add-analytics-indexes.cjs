"use strict";

// Analytics count orders by the moment they became PAID [AC-ANL-06]. Without this index MySQL
// reads every status change ever made to find the PAID ones in a date range.
// "Orders by status" counts orders placed in a range, so orders get a created_at index too.
module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex("order_status_history", ["to_status", "created_at"]);
    await queryInterface.addIndex("orders", ["created_at"]);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("orders", ["created_at"]);
    await queryInterface.removeIndex("order_status_history", ["to_status", "created_at"]);
  },
};
