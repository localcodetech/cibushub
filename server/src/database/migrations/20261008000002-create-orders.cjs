"use strict";

// A frozen copy of the status list: migrations must never change when the app code changes
const ORDER_STATUSES = [
  "PENDING_PAYMENT",
  "PAID",
  "ACCEPTED",
  "REJECTED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "RIDER_ASSIGNED",
  "PICKED_UP",
  "DELIVERED",
  "CANCELLED",
];

const timestamps = (Sequelize) => ({
  created_at: { type: Sequelize.DATE, allowNull: false },
  updated_at: { type: Sequelize.DATE, allowNull: false },
});

module.exports = {
  async up(queryInterface, Sequelize) {
    // ─────────────────────────────────────────────
    // Orders: who, where from, where to, and every amount frozen at order time
    // ─────────────────────────────────────────────
    await queryInterface.createTable("orders", {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      order_number: { type: Sequelize.STRING(20), allowNull: false, unique: true },
      customer_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      restaurant_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "restaurants", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      status: {
        type: Sequelize.ENUM(...ORDER_STATUSES),
        allowNull: false,
        defaultValue: "PENDING_PAYMENT",
      },
      payment_method: {
        type: Sequelize.ENUM("PAYSTACK", "CASH"),
        allowNull: false,
        defaultValue: "PAYSTACK",
      },
      // Kept apart from the order status: a delivered order can still be refunded later
      payment_status: {
        type: Sequelize.ENUM("UNPAID", "PAID", "REFUNDED", "PARTIALLY_REFUNDED"),
        allowNull: false,
        defaultValue: "UNPAID",
      },

      // Money, in whole pesewas
      subtotal_pesewas: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      delivery_fee_pesewas: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      service_fee_pesewas: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      discount_pesewas: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      total_pesewas: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      delivery_distance_meters: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      // How the fees were worked out (formula and numbers), for disputes later
      pricing_snapshot: { type: Sequelize.JSON, allowNull: false },

      // Delivery address and contact, copied so later edits never change a past order
      delivery_label: { type: Sequelize.STRING(10), allowNull: false },
      delivery_latitude: { type: Sequelize.DECIMAL(10, 7), allowNull: false },
      delivery_longitude: { type: Sequelize.DECIMAL(10, 7), allowNull: false },
      delivery_ghana_post_gps: { type: Sequelize.STRING(15), allowNull: true },
      delivery_area: { type: Sequelize.STRING(100), allowNull: true },
      delivery_landmark: { type: Sequelize.STRING(255), allowNull: true },
      contact_phone: { type: Sequelize.STRING(20), allowNull: false },

      // Notes: one for the kitchen, one for the rider
      restaurant_note: { type: Sequelize.STRING(500), allowNull: true },
      rider_note: { type: Sequelize.STRING(500), allowNull: true },

      // Same key twice from the same customer = the same order [AC-CHK-09]
      idempotency_key: { type: Sequelize.STRING(64), allowNull: false },
      cancellation_reason: { type: Sequelize.STRING(500), allowNull: true },
      ...timestamps(Sequelize),
    });

    await queryInterface.addIndex("orders", ["customer_id", "idempotency_key"], {
      unique: true,
      name: "orders_one_per_idempotency_key",
    });
    await queryInterface.addIndex("orders", ["customer_id", "created_at"]);
    await queryInterface.addIndex("orders", ["restaurant_id", "status"]);
    await queryInterface.addIndex("orders", ["status", "created_at"]);

    // ─────────────────────────────────────────────
    // Order items: a frozen copy of each dish as it was when ordered
    // ─────────────────────────────────────────────
    await queryInterface.createTable("order_items", {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      order_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "orders", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      // Only a pointer back; the copies below are what the order shows
      menu_item_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "menu_items", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      name: { type: Sequelize.STRING(120), allowNull: false },
      base_price_pesewas: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      unit_price_pesewas: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      quantity: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      line_total_pesewas: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      ...timestamps(Sequelize),
    });

    await queryInterface.addIndex("order_items", ["order_id"]);

    // ─────────────────────────────────────────────
    // The options chosen for each item ("Protein: Fish +GHS 5.00"), also frozen
    // ─────────────────────────────────────────────
    await queryInterface.createTable("order_item_options", {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      order_item_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "order_items", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      option_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "menu_options", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      group_name: { type: Sequelize.STRING(80), allowNull: false },
      name: { type: Sequelize.STRING(80), allowNull: false },
      extra_price_pesewas: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      ...timestamps(Sequelize),
    });

    await queryInterface.addIndex("order_item_options", ["order_item_id"]);

    // ─────────────────────────────────────────────
    // Status history: every change, who made it and why [AC-ORD-04]
    // ─────────────────────────────────────────────
    await queryInterface.createTable("order_status_history", {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      order_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "orders", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      // Empty for the very first row, when the order is created
      from_status: { type: Sequelize.ENUM(...ORDER_STATUSES), allowNull: true },
      to_status: { type: Sequelize.ENUM(...ORDER_STATUSES), allowNull: false },
      // Empty when the system made the change (e.g. a payment webhook)
      actor_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      actor_role: { type: Sequelize.STRING(20), allowNull: false },
      reason: { type: Sequelize.STRING(500), allowNull: true },
      ...timestamps(Sequelize),
    });

    await queryInterface.addIndex("order_status_history", ["order_id", "created_at"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("order_status_history");
    await queryInterface.dropTable("order_item_options");
    await queryInterface.dropTable("order_items");
    await queryInterface.dropTable("orders");
  },
};
