"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { default: env } = require("../../config/env/env.js");
const { uploadNamedImage } = require("../../services/upload/cloudinary.service.js");
const {
  User,
  Restaurant,
  OpeningHours,
  MenuCategory,
  MenuItem,
  OptionGroup,
  Option,
} = require("../../models/index.js");
const { hashPassword } = require("../../utils/auth/password.js");
const { DEMO_PASSWORD, users, restaurants } = require("./data/kumasiRestaurants.cjs");
const { verifiedDemoAccount } = require("./data/demoAccount.cjs");
const { withDisplayOrder } = require("./data/menuHelpers.cjs");

const PHOTO_FOLDER = path.join(__dirname, "data", "photos");

// Brings the demo restaurants up to date with data/kumasiRestaurants.cjs:
//   - adds any demo owner who isn't there yet (only once the demo has been seeded at all)
//   - adds any restaurant that isn't there yet, with its opening hours
//   - adds any dish that isn't there yet (a dish an owner deleted stays deleted)
//   - gives every restaurant its cover photo and every dish its photo, if it has none
// Safe to run again and again: nothing is added or uploaded twice. The photos are real food
// photos from Wikimedia Commons, credited in data/photos/credits.json and on /photo-credits.
module.exports = {
  async up() {
    if (env.NODE_ENV === "production" && !env.DEMO_SITE) {
      console.log("Demo photos and dishes are never seeded on the real site, skipping.");
      return;
    }

    let demoOwners = await User.findAll({ where: { email: users.map((user) => user.email) } });
    if (demoOwners.length === 0) {
      console.log("No demo restaurants yet (run the demo-restaurants seeder first), skipping.");
      return;
    }

    // Owners added to the data later (e.g. a new restaurant's owner)
    const missingUsers = users.filter(
      (user) => !demoOwners.some((owner) => owner.email === user.email),
    );
    if (missingUsers.length > 0) {
      const passwordHash = await hashPassword(DEMO_PASSWORD);
      // "key" isn't a user column: Sequelize leaves it out
      for (const user of missingUsers) {
        await User.create({ ...user, passwordHash, ...verifiedDemoAccount(new Date()) });
      }
      demoOwners = await User.findAll({ where: { email: users.map((user) => user.email) } });
    }
    const ownerIds = demoOwners.map((owner) => owner.id);
    // "akua" -> her user id, for restaurants that are added here
    const ownerIdByKey = {};
    for (const user of users) {
      const owner = demoOwners.find((found) => found.email === user.email);
      if (owner) ownerIdByKey[user.key] = owner.id;
    }

    // Each photo goes to Cloudinary once, as cibushub/demo/<name>
    const uploaded = {};
    // Each photo goes to Cloudinary once, tried up to 3 times (a slow line can drop one).
    // If it still fails, the dish simply stays without a photo for now: running this seeder
    // again fills it in. Cloudinary reports errors as plain objects, so the message is read out.
    const skipped = [];
    const photo = async (name) => {
      if (uploaded[name]) {
        return uploaded[name];
      }
      const file = fs.readFileSync(path.join(PHOTO_FOLDER, `${name}.webp`));
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
          uploaded[name] = await uploadNamedImage(file, `cibushub/demo/${name}`);
          return uploaded[name];
        } catch (error) {
          const reason =
            error.message || (error.error && error.error.message) || JSON.stringify(error);
          if (attempt === 3) {
            console.log(`Photo "${name}" not uploaded (${reason}); run this seeder again later.`);
            skipped.push(name);
            return null;
          }
          await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
        }
      }
      return null;
    };

    let addedRestaurants = 0;
    let addedDishes = 0;
    let addedPhotos = 0;

    for (const restaurantData of restaurants) {
      let restaurant = await Restaurant.findOne({
        where: { name: restaurantData.name, ownerId: ownerIds },
        paranoid: false,
      });

      if (!restaurant) {
        // menu and cover aren't restaurant columns: Sequelize leaves them out
        const { ownerKey, ...details } = restaurantData;
        if (!ownerIdByKey[ownerKey]) {
          continue;
        }
        const wasApproved = ["APPROVED", "SUSPENDED"].includes(details.status);
        restaurant = await Restaurant.create(
          {
            ...details,
            ownerId: ownerIdByKey[ownerKey],
            approvedAt: wasApproved ? new Date() : null,
          },
          { include: [{ model: OpeningHours, as: "openingHours" }] },
        );
        addedRestaurants += 1;
      }
      // A restaurant removed on purpose stays removed
      if (restaurant.deletedAt) {
        continue;
      }

      if (restaurantData.cover && !restaurant.coverImageUrl) {
        const cover = await photo(restaurantData.cover);
        if (cover) {
          await restaurant.update({
            coverImageUrl: cover.url,
            coverImagePublicId: cover.publicId,
          });
          addedPhotos += 1;
        }
      }

      for (const [categoryPosition, categoryData] of restaurantData.menu.entries()) {
        const [category] = await MenuCategory.findOrCreate({
          where: { restaurantId: restaurant.id, name: categoryData.category },
          defaults: { displayOrder: categoryPosition },
        });

        for (const [itemPosition, itemData] of categoryData.items.entries()) {
          // paranoid: false also finds a dish the owner deleted, so it isn't brought back
          let item = await MenuItem.findOne({
            where: { restaurantId: restaurant.id, name: itemData.name },
            paranoid: false,
          });

          if (!item) {
            item = await MenuItem.create(
              {
                ...itemData,
                restaurantId: restaurant.id,
                categoryId: category.id,
                displayOrder: itemPosition,
                stockRemaining: itemData.dailyStock ?? null,
                optionGroups: withDisplayOrder(itemData.optionGroups),
              },
              {
                include: [
                  {
                    model: OptionGroup,
                    as: "optionGroups",
                    include: [{ model: Option, as: "options" }],
                  },
                ],
              },
            );
            addedDishes += 1;
          }

          if (itemData.photo && !item.imageUrl && !item.deletedAt) {
            const image = await photo(itemData.photo);
            if (image) {
              await item.update({ imageUrl: image.url, imagePublicId: image.publicId });
              addedPhotos += 1;
            }
          }
        }
      }
    }

    console.log(
      `Demo menus: ${addedRestaurants} restaurants, ${addedDishes} dishes and ${addedPhotos} photos added.`,
    );
    if (skipped.length > 0) {
      console.log(`${skipped.length} photos still to upload: run this seeder again to add them.`);
    }
  },

  // The photos stay on Cloudinary (other runs reuse them); the demo-restaurants seeder's
  // undo removes the restaurants and dishes themselves
  async down() {},
};
