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
const { users, restaurants } = require("./data/kumasiRestaurants.cjs");
const { withDisplayOrder } = require("./data/menuHelpers.cjs");

const PHOTO_FOLDER = path.join(__dirname, "data", "photos");

// Brings the demo restaurants up to date with data/kumasiRestaurants.cjs:
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

    const demoOwners = await User.findAll({ where: { email: users.map((user) => user.email) } });
    const ownerIds = demoOwners.map((owner) => owner.id);
    // "akua" -> her user id, for restaurants that are added here
    const ownerIdByKey = {};
    for (const user of users) {
      const owner = demoOwners.find((found) => found.email === user.email);
      if (owner) ownerIdByKey[user.key] = owner.id;
    }
    if (ownerIds.length === 0) {
      console.log("No demo restaurants yet (run the demo-restaurants seeder first), skipping.");
      return;
    }

    // Each photo goes to Cloudinary once, as cibushub/demo/<name>
    const uploaded = {};
    const photo = async (name) => {
      if (!uploaded[name]) {
        const file = fs.readFileSync(path.join(PHOTO_FOLDER, `${name}.webp`));
        uploaded[name] = await uploadNamedImage(file, `cibushub/demo/${name}`);
      }
      return uploaded[name];
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
        await restaurant.update({
          coverImageUrl: cover.url,
          coverImagePublicId: cover.publicId,
        });
        addedPhotos += 1;
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
            await item.update({ imageUrl: image.url, imagePublicId: image.publicId });
            addedPhotos += 1;
          }
        }
      }
    }

    console.log(
      `Demo menus: ${addedRestaurants} restaurants, ${addedDishes} dishes and ${addedPhotos} photos added.`,
    );
  },

  // The photos stay on Cloudinary (other runs reuse them); the demo-restaurants seeder's
  // undo removes the restaurants and dishes themselves
  async down() {},
};
