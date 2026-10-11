import { Op } from "sequelize";
import sequelize from "../config/database.js";
import { MenuItem, OpeningHours, Restaurant, User } from "../models/index.js";

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
export const findRestaurantsForAdmin = ({ status, search, limit, offset }) => {
  const where = {};
  if (status) {
    where.status = status;
  }
  // "gold" finds "Golden Pot Kitchen" (LIKE: fine for an admin list of a few hundred)
  if (search) {
    where.name = { [Op.like]: `%${search.replace(/[%_\\]/g, "\\$&")}%` };
  }
  return Restaurant.findAndCountAll({
    where,
    include: [{ model: User, as: "owner", attributes: ["id", "fullName", "email", "phone"] }],
    order: [["createdAt", "ASC"]],
    limit,
    offset,
  });
};

// ─────────────────────────────────────────────
// Public search (MySQL FULLTEXT) [AC-DISC-05]
// ─────────────────────────────────────────────

// "Jollof rice!" → "jollof* rice*": only letters and numbers, and each word also
// matches longer words ("jol" finds "jollof") while the customer is still typing
const toFullTextQuery = (text) => {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .map((word) => `${word}*`)
    .join(" ");
};

// Approved restaurants only [AC-DISC-02]; optional search and cuisine filters
export const findPublicRestaurants = ({ search, cuisine }) => {
  const conditions = [{ status: "APPROVED" }];

  if (cuisine) {
    conditions.push(
      sequelize.where(
        sequelize.fn("JSON_CONTAINS", sequelize.col("cuisine_tags"), JSON.stringify(cuisine)),
        1,
      ),
    );
  }

  if (search) {
    const terms = sequelize.escape(toFullTextQuery(search));
    const startOfWord = sequelize.escape(`${search.toLowerCase()}%`);

    conditions.push({
      [Op.or]: [
        // Restaurant name or description, e.g. "Auntie Esi"
        sequelize.literal(
          `MATCH(\`Restaurant\`.\`name\`, \`Restaurant\`.\`description\`) AGAINST(${terms} IN BOOLEAN MODE)`,
        ),
        // A dish on its menu, e.g. "waakye"
        sequelize.literal(
          `\`Restaurant\`.\`id\` IN (SELECT \`restaurant_id\` FROM \`menu_items\` WHERE \`deleted_at\` IS NULL AND MATCH(\`name\`, \`description\`) AGAINST(${terms} IN BOOLEAN MODE))`,
        ),
        // A cuisine tag, e.g. "pizza"
        sequelize.literal(
          `JSON_SEARCH(\`Restaurant\`.\`cuisine_tags\`, 'one', ${startOfWord}) IS NOT NULL`,
        ),
      ],
    });
  }

  return Restaurant.findAll({
    where: { [Op.and]: conditions },
    include: [{ model: OpeningHours, as: "openingHours" }],
  });
};

// The dishes that matched the search, so results can show "Waakye Special — GHS 35.00"
export const findMatchingDishes = (restaurantIds, search) => {
  const terms = sequelize.escape(toFullTextQuery(search));

  return MenuItem.findAll({
    where: {
      restaurantId: restaurantIds,
      [Op.and]: sequelize.literal(
        `MATCH(\`name\`, \`description\`) AGAINST(${terms} IN BOOLEAN MODE)`,
      ),
    },
    attributes: ["id", "restaurantId", "name", "pricePesewas", "isAvailable"],
  });
};
