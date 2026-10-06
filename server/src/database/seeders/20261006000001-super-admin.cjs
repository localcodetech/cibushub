"use strict";

const { randomUUID } = require("node:crypto");
const { default: env } = require("../../config/env/env.js");
const { hashPassword } = require("../../utils/password.js");

module.exports = {
  async up(queryInterface, Sequelize) {
    const name = env.SUPER_ADMIN_NAME;
    const email = env.SUPER_ADMIN_EMAIL;
    const phone = env.SUPER_ADMIN_PHONE;
    const password = env.SUPER_ADMIN_PASSWORD;

    if (!name || !email || !phone || !password) {
      throw new Error(
        "Set SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL, SUPER_ADMIN_PHONE and SUPER_ADMIN_PASSWORD in .env",
      );
    }

    const existing = await queryInterface.sequelize.query(
      "SELECT id FROM users WHERE email = ? OR phone = ? LIMIT 1",
      { replacements: [email, phone], type: Sequelize.QueryTypes.SELECT },
    );

    if (existing.length > 0) {
      console.log("Super admin already exists, skipping.");
      return;
    }

    const now = new Date();

    await queryInterface.bulkInsert("users", [
      {
        id: randomUUID(),
        full_name: name,
        email: email,
        phone: phone,
        password_hash: await hashPassword(password),
        role: "SUPER_ADMIN",
        status: "ACTIVE",
        email_verified_at: now,
        phone_verified_at: now,
        created_at: now,
        updated_at: now,
      },
    ]);

    console.log("Super admin created.");
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("users", {
      email: env.SUPER_ADMIN_EMAIL,
      role: "SUPER_ADMIN",
    });
  },
};
