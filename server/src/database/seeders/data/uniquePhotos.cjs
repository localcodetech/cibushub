"use strict";

const fs = require("node:fs");
const path = require("node:path");

const PHOTO_FOLDER = path.join(__dirname, "photos");

// Every dish on the demo gets a photo of its own: when two restaurants sell the same dish
// (e.g. Kelewele), they show two different photos of it, so comparing them in the dish
// search looks real.
//
// The first restaurant keeps the dish's photo, e.g. "kelewele"; the next ones take
// "kelewele-2", "kelewele-3"... from data/photos, each credited in data/photos/credits.json.
// Restaurant covers are counted first, so a cover is never also a dish photo.
// When a dish has no photo of its own left, that restaurant simply doesn't sell it: a menu
// never shows a repeated photo, or a photo of something else. (Rare dishes such as brukina
// have few free photos, so fewer kitchens sell them.)
const withUniquePhotos = (restaurants) => {
  const files = new Set(
    fs
      .readdirSync(PHOTO_FOLDER)
      .filter((file) => file.endsWith(".webp"))
      .map((file) => file.replace(/\.webp$/, "")),
  );
  const taken = new Set(restaurants.map((restaurant) => restaurant.cover).filter(Boolean));

  // "kelewele" -> the first of kelewele, kelewele-2, kelewele-3... that is still free,
  // or null when they are all taken
  const freePhoto = (photo) => {
    for (let number = 1; ; number += 1) {
      const name = number === 1 ? photo : `${photo}-${number}`;
      if (!files.has(name)) {
        return null;
      }
      if (!taken.has(name)) {
        taken.add(name);
        return name;
      }
    }
  };

  return restaurants.map((restaurant) => ({
    ...restaurant,
    menu: restaurant.menu.map((category) => ({
      ...category,
      // A new object per dish: the same dish object is shared by several restaurants' menus
      items: category.items
        .map((item) => (item.photo ? { ...item, photo: freePhoto(item.photo) } : item))
        .filter((item) => item.photo !== null),
    })),
  }));
};

module.exports = { withUniquePhotos };
