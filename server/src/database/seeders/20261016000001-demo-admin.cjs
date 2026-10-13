"use strict";

const { default: env } = require("../../config/env/env.js");
const { hashPassword } = require("../../utils/auth/password.js");
const { User } = require("../../models/index.js");
const { DEMO_PASSWORD } = require("./data/kumasiRestaurants.cjs");
const { verifiedDemoAccount } = require("./data/demoAccount.cjs");

// A fictional demo admin (an ADMIN, not a super admin), so the admin screens can be tried
// and shown without the real super admin's password. Made-up phone and @example.com email.
const DEMO_ADMIN = {
  fullName: "Esi Owusu",
  email: "esi.admin@example.com",
  phone: "+233240000601",
};

module.exports = {
  async up() {
    // Demo accounts with a shared password must never reach real users
    if (env.NODE_ENV === "production" && !env.DEMO_SITE) {
      console.log("The demo admin is never seeded on the real site, skipping.");
      return;
    }

    const alreadySeeded = await User.findOne({ where: { email: DEMO_ADMIN.email } });
    if (alreadySeeded) {
      console.log("The demo admin already exists, skipping.");
      return;
    }

    const now = new Date();
    await User.create({
      ...DEMO_ADMIN,
      role: "ADMIN",
      status: "ACTIVE",
      passwordHash: await hashPassword(DEMO_PASSWORD),
      ...verifiedDemoAccount(now),
    });

    console.log(`Seeded the demo admin ${DEMO_ADMIN.email}. Password: ${DEMO_PASSWORD}`);
  },

  // Removes only the demo admin
  async down() {
    await User.destroy({ where: { email: DEMO_ADMIN.email }, force: true });
  },
};
