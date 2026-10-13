"use strict";

const { default: env } = require("../../config/env/env.js");
const { verifiedDemoAccount } = require("./data/demoAccount.cjs");
const { default: sequelize } = require("../../config/database.js");
const { hashPassword } = require("../../utils/auth/password.js");
const { User, RiderProfile } = require("../../models/index.js");
const { DEMO_PASSWORD } = require("./data/kumasiRestaurants.cjs");
const { riders } = require("./data/kumasiRiders.cjs");

const demoEmails = riders.map((rider) => rider.user.email);

// Demo riders: three approved (motorbike, bicycle, car) and one waiting for review.
// They start OFFLINE: going online needs a live location, so log in and tap the switch.
module.exports = {
  async up() {
    // Demo accounts with a shared password must never reach real users
    if (env.NODE_ENV === "production" && !env.DEMO_SITE) {
      console.log("Demo riders are never seeded on the real site, skipping.");
      return;
    }

    const alreadySeeded = await User.findOne({ where: { email: demoEmails[0] } });
    if (alreadySeeded) {
      console.log("Demo riders already exist, skipping.");
      return;
    }

    const passwordHash = await hashPassword(DEMO_PASSWORD);
    const now = new Date();

    await sequelize.transaction(async (transaction) => {
      for (const rider of riders) {
        const user = await User.create(
          { ...rider.user, role: "RIDER", passwordHash, ...verifiedDemoAccount(now) },
          { transaction },
        );
        const isApproved = rider.profile.status === "APPROVED";
        await RiderProfile.create(
          {
            ...rider.profile,
            userId: user.id,
            submittedAt: now,
            approvedAt: isApproved ? now : null,
          },
          { transaction },
        );
      }
    });

    console.log(`Seeded ${riders.length} demo riders. Password: ${DEMO_PASSWORD}`);
  },

  // Removes only the demo riders (their profile goes with the user)
  async down() {
    const demoUsers = await User.findAll({ where: { email: demoEmails }, paranoid: false });
    const demoUserIds = demoUsers.map((user) => user.id);

    await RiderProfile.destroy({ where: { userId: demoUserIds } });
    await User.destroy({ where: { id: demoUserIds }, force: true });
  },
};
