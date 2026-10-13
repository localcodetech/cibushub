"use strict";

const { default: env } = require("../../config/env/env.js");
const { verifiedDemoAccount } = require("./data/demoAccount.cjs");
const { default: sequelize } = require("../../config/database.js");
const { hashPassword } = require("../../utils/auth/password.js");
const {
  User,
  Restaurant,
  OpeningHours,
  MenuCategory,
  MenuItem,
  OptionGroup,
  Option,
} = require("../../models/index.js");
const { DEMO_PASSWORD, users, restaurants } = require("./data/kumasiRestaurants.cjs");
const { withDisplayOrder } = require("./data/menuHelpers.cjs");

const demoEmails = users.map((user) => user.email);

module.exports = {
  async up() {
    // Demo accounts with a shared password must never reach real users
    if (env.NODE_ENV === "production" && !env.DEMO_SITE) {
      console.log("Demo restaurants are never seeded on the real site, skipping.");
      return;
    }

    const alreadySeeded = await User.findOne({ where: { email: demoEmails[0] } });
    if (alreadySeeded) {
      console.log("Demo restaurants already exist, skipping.");
      return;
    }

    const passwordHash = await hashPassword(DEMO_PASSWORD);
    const now = new Date();

    await sequelize.transaction(async (transaction) => {
      // ─────────────────────────────────────────────
      // Demo people (phone already verified)
      // ─────────────────────────────────────────────
      const userIdByKey = {};
      for (const user of users) {
        const { key, ...details } = user;
        const saved = await User.create(
          { ...details, passwordHash, ...verifiedDemoAccount(now) },
          { transaction },
        );
        userIdByKey[key] = saved.id;
      }

      // ─────────────────────────────────────────────
      // Restaurants with their hours and menus
      // ─────────────────────────────────────────────
      for (const restaurant of restaurants) {
        const { ownerKey, menu, ...details } = restaurant;
        const wasApproved = ["APPROVED", "SUSPENDED"].includes(details.status);

        const savedRestaurant = await Restaurant.create(
          {
            ...details,
            ownerId: userIdByKey[ownerKey],
            approvedAt: wasApproved ? now : null,
          },
          { include: [{ model: OpeningHours, as: "openingHours" }], transaction },
        );

        for (const [categoryPosition, category] of menu.entries()) {
          const savedCategory = await MenuCategory.create(
            {
              restaurantId: savedRestaurant.id,
              name: category.category,
              displayOrder: categoryPosition,
            },
            { transaction },
          );

          for (const [itemPosition, item] of category.items.entries()) {
            await MenuItem.create(
              {
                ...item,
                restaurantId: savedRestaurant.id,
                categoryId: savedCategory.id,
                displayOrder: itemPosition,
                stockRemaining: item.dailyStock ?? null,
                optionGroups: withDisplayOrder(item.optionGroups),
              },
              {
                include: [
                  {
                    model: OptionGroup,
                    as: "optionGroups",
                    include: [{ model: Option, as: "options" }],
                  },
                ],
                transaction,
              },
            );
          }
        }
      }
    });

    console.log(
      `Seeded ${users.length} demo users and ${restaurants.length} Kumasi restaurants. Password: ${DEMO_PASSWORD}`,
    );
  },

  // Removes only the demo data, children before parents
  async down() {
    const demoUsers = await User.findAll({ where: { email: demoEmails }, paranoid: false });
    const demoUserIds = demoUsers.map((user) => user.id);

    const demoRestaurants = await Restaurant.findAll({
      where: { ownerId: demoUserIds },
      paranoid: false,
    });
    const restaurantIds = demoRestaurants.map((restaurant) => restaurant.id);

    await MenuItem.destroy({ where: { restaurantId: restaurantIds }, force: true });
    await MenuCategory.destroy({ where: { restaurantId: restaurantIds }, force: true });
    await Restaurant.destroy({ where: { id: restaurantIds }, force: true });
    await User.destroy({ where: { id: demoUserIds }, force: true });
  },
};
