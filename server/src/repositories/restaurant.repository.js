import { OpeningHours, Restaurant, User } from "../models/index.js";

const WITH_OPENING_HOURS = {
  include: [{ model: OpeningHours, as: "openingHours" }],
  order: [[{ model: OpeningHours, as: "openingHours" }, "dayOfWeek", "ASC"]],
};

export const createRestaurant = (data, transaction) => {
  return Restaurant.create(data, { transaction });
};

export const createOpeningHours = (restaurantId, days, transaction) => {
  const rows = days.map((day) => ({ ...day, restaurantId }));
  return OpeningHours.bulkCreate(rows, { transaction });
};

export const deleteOpeningHours = (restaurantId, transaction) => {
  return OpeningHours.destroy({ where: { restaurantId }, transaction });
};

export const updateRestaurant = (restaurant, changes, transaction) => {
  return restaurant.update(changes, { transaction });
};

export const findRestaurantById = (id, transaction) => {
  return Restaurant.findByPk(id, { ...WITH_OPENING_HOURS, transaction });
};

// Only finds the restaurant if it belongs to this owner
export const findOwnedRestaurant = (id, ownerId) => {
  return Restaurant.findOne({ where: { id, ownerId }, ...WITH_OPENING_HOURS });
};

export const findRestaurantsByOwner = (ownerId) => {
  return Restaurant.findAll({
    where: { ownerId },
    include: [{ model: OpeningHours, as: "openingHours" }],
    order: [
      ["createdAt", "DESC"],
      [{ model: OpeningHours, as: "openingHours" }, "dayOfWeek", "ASC"],
    ],
  });
};

// The admin's review queue: oldest first, so nobody waits forever
export const findRestaurantsForAdmin = ({ status, limit, offset }) => {
  return Restaurant.findAndCountAll({
    where: status ? { status } : {},
    include: [{ model: User, as: "owner", attributes: ["id", "fullName", "email", "phone"] }],
    order: [["createdAt", "ASC"]],
    limit,
    offset,
  });
};
