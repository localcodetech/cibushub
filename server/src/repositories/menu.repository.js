import { Op } from "sequelize";
import sequelize from "../config/database.js";
import { MenuCategory, MenuItem, Option, OptionGroup } from "../models/index.js";

// An item with its option groups and their options, all in display order
const WITH_OPTION_GROUPS = {
  include: [
    {
      model: OptionGroup,
      as: "optionGroups",
      include: [{ model: Option, as: "options" }],
    },
  ],
  order: [
    [{ model: OptionGroup, as: "optionGroups" }, "displayOrder", "ASC"],
    [
      { model: OptionGroup, as: "optionGroups" },
      { model: Option, as: "options" },
      "displayOrder",
      "ASC",
    ],
  ],
};

// ─────────────────────────────────────────────
// Categories
// ─────────────────────────────────────────────
export const findCategoryInRestaurant = (categoryId, restaurantId) => {
  return MenuCategory.findOne({ where: { id: categoryId, restaurantId } });
};

export const findHighestCategoryOrder = (restaurantId) => {
  return MenuCategory.max("displayOrder", { where: { restaurantId } });
};

export const createCategory = (data) => {
  return MenuCategory.create(data);
};

export const updateCategory = (category, changes) => {
  return category.update(changes);
};

export const deleteCategory = (category) => {
  return category.destroy();
};

export const countItemsInCategory = (categoryId) => {
  return MenuItem.count({ where: { categoryId } });
};

export const setAvailabilityForCategory = (categoryId, isAvailable) => {
  return MenuItem.update({ isAvailable }, { where: { categoryId } });
};

// ─────────────────────────────────────────────
// Items
// ─────────────────────────────────────────────
export const findItemInRestaurant = (itemId, restaurantId) => {
  return MenuItem.findOne({ where: { id: itemId, restaurantId }, ...WITH_OPTION_GROUPS });
};

export const findHighestItemOrder = (categoryId) => {
  return MenuItem.max("displayOrder", { where: { categoryId } });
};

export const createItem = (data, transaction) => {
  return MenuItem.create(data, { transaction });
};

export const updateItem = (item, changes, transaction) => {
  return item.update(changes, { transaction });
};

export const deleteItem = (item) => {
  return item.destroy();
};

// ─────────────────────────────────────────────
// Option groups (always saved together with their options)
// ─────────────────────────────────────────────
export const createOptionGroups = async (menuItemId, groups, transaction) => {
  for (const [position, group] of groups.entries()) {
    const options = group.options.map((option, optionPosition) => ({
      ...option,
      displayOrder: optionPosition,
    }));

    await OptionGroup.create(
      { ...group, options, menuItemId, displayOrder: position },
      { include: [{ model: Option, as: "options" }], transaction },
    );
  }
};

// Deleting a group also deletes its options (ON DELETE CASCADE in MySQL)
export const deleteOptionGroups = (menuItemId, transaction) => {
  return OptionGroup.destroy({ where: { menuItemId }, transaction });
};

// ─────────────────────────────────────────────
// The full menu: categories → items → option groups → options
// ─────────────────────────────────────────────
// The items in a cart, with their options; deleted items are simply not found
export const findItemsForCart = (restaurantId, itemIds, transaction) => {
  return MenuItem.findAll({
    where: { restaurantId, id: itemIds },
    ...WITH_OPTION_GROUPS,
    transaction,
  });
};

// Locks the cart's dishes until the order is saved, always in ID order so two
// checkouts can never wait on each other in a circle (a deadlock) [AC-CHK-06]
export const lockItemsForOrder = (itemIds, transaction) => {
  return MenuItem.findAll({
    where: { id: itemIds },
    attributes: ["id", "stockRemaining"],
    order: [["id", "ASC"]],
    lock: transaction.LOCK.UPDATE,
    transaction,
  });
};

// Takes stock only if enough is left; returns false if not [AC-MENU-07]
export const decreaseStock = async (itemId, quantity, transaction) => {
  const [rowsChanged] = await MenuItem.update(
    { stockRemaining: sequelize.literal(`stock_remaining - ${Number(quantity)}`) },
    {
      where: { id: itemId, stockRemaining: { [Op.gte]: quantity } },
      transaction,
    },
  );

  return rowsChanged === 1;
};

export const findFullMenu = (restaurantId) => {
  return MenuCategory.findAll({
    where: { restaurantId },
    include: [
      {
        model: MenuItem,
        as: "items",
        include: WITH_OPTION_GROUPS.include,
      },
    ],
    order: [
      ["displayOrder", "ASC"],
      [{ model: MenuItem, as: "items" }, "displayOrder", "ASC"],
      [
        { model: MenuItem, as: "items" },
        { model: OptionGroup, as: "optionGroups" },
        "displayOrder",
        "ASC",
      ],
      [
        { model: MenuItem, as: "items" },
        { model: OptionGroup, as: "optionGroups" },
        { model: Option, as: "options" },
        "displayOrder",
        "ASC",
      ],
    ],
  });
};
