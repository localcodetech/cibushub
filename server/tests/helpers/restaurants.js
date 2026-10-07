import { OpeningHours, Restaurant } from "../../src/models/index.js";
import { createTestUser } from "./users.js";

// Sunday closed, Monday to Saturday 08:00-22:00
export const fullWeek = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
  dayOfWeek,
  isClosed: dayOfWeek === 0,
  opensAt: dayOfWeek === 0 ? null : "08:00",
  closesAt: dayOfWeek === 0 ? null : "22:00",
}));

export const validRestaurant = {
  name: "Auntie Esi's Kitchen",
  legalName: "Esi Foods Ltd",
  description: "Home-style waakye and jollof",
  phone: "0241234567",
  cuisineTags: ["Ghanaian", "Rice"],
  addressLine: "12 Prempeh II Street",
  area: "Adum",
  latitude: 6.6885,
  longitude: -1.6244,
  openingHours: fullWeek,
};

// An owner as AC-AUTH-05 describes: waiting for approval, phone verified
export const createOwner = (overrides = {}) => {
  return createTestUser({
    role: "RESTAURANT_OWNER",
    status: "PENDING_APPROVAL",
    phoneVerifiedAt: new Date(),
    ...overrides,
  });
};

// Saves a restaurant straight into the database, skipping the API
export const createTestRestaurant = async (owner, overrides = {}) => {
  const restaurant = await Restaurant.create({
    ...validRestaurant,
    phone: "+233241234567",
    cuisineTags: ["ghanaian", "rice"],
    ownerId: owner.id,
    ...overrides,
  });

  await OpeningHours.bulkCreate(fullWeek.map((day) => ({ ...day, restaurantId: restaurant.id })));

  return restaurant;
};
