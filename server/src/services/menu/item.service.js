import sequelize from "../../config/database.js";
import AppError from "../../utils/AppError.js";
import { getMyEditableRestaurant } from "../restaurant/myRestaurants.service.js";
import { clearCachedMenu } from "./menuCache.service.js";
import {
  createItem,
  createOptionGroups,
  deleteItem,
  deleteOptionGroups,
  findCategoryInRestaurant,
  findHighestItemOrder,
  findItemInRestaurant,
  updateItem,
} from "../../repositories/menu.repository.js";

// Finds an item only inside the owner's own restaurant
export const getMyItem = async (restaurantId, itemId, ownerId) => {
  await getMyEditableRestaurant(restaurantId, ownerId);

  const item = await findItemInRestaurant(itemId, restaurantId);

  if (!item) {
    throw new AppError(404, "NOT_FOUND", "Menu item not found");
  }

  return item;
};

// The category must belong to the same restaurant as the item
const checkCategoryIsMine = async (categoryId, restaurantId) => {
  const category = await findCategoryInRestaurant(categoryId, restaurantId);

  if (!category) {
    throw new AppError(400, "VALIDATION_ERROR", "Invalid request data", [
      { field: "categoryId", message: "Choose one of this restaurant's categories" },
    ]);
  }
};

// [AC-MENU-03, AC-MENU-06]
export const addItem = async (restaurantId, ownerId, data) => {
  await getMyEditableRestaurant(restaurantId, ownerId);
  await checkCategoryIsMine(data.categoryId, restaurantId);

  const { optionGroups, ...itemDetails } = data;

  // No position given → put it at the end of its category
  if (itemDetails.displayOrder === undefined) {
    const highestOrder = await findHighestItemOrder(itemDetails.categoryId);
    itemDetails.displayOrder = highestOrder === null ? 0 : highestOrder + 1;
  }

  // A new item starts the day with its full stock [AC-MENU-07]
  itemDetails.stockRemaining = itemDetails.dailyStock ?? null;

  const itemId = await sequelize.transaction(async (transaction) => {
    const item = await createItem({ ...itemDetails, restaurantId }, transaction);
    await createOptionGroups(item.id, optionGroups, transaction);
    return item.id;
  });
  await clearCachedMenu(restaurantId);

  return findItemInRestaurant(itemId, restaurantId);
};

export const editItem = async (restaurantId, itemId, ownerId, changes) => {
  const item = await getMyItem(restaurantId, itemId, ownerId);

  if (changes.categoryId !== undefined) {
    await checkCategoryIsMine(changes.categoryId, restaurantId);
  }

  const { optionGroups, ...itemChanges } = changes;

  // A new daily stock also refills what is left today
  if (itemChanges.dailyStock !== undefined) {
    itemChanges.stockRemaining = itemChanges.dailyStock;
  }

  // The item and its option groups change together, or not at all
  await sequelize.transaction(async (transaction) => {
    if (Object.keys(itemChanges).length > 0) {
      await updateItem(item, itemChanges, transaction);
    }

    if (optionGroups !== undefined) {
      await deleteOptionGroups(item.id, transaction);
      await createOptionGroups(item.id, optionGroups, transaction);
    }
  });
  await clearCachedMenu(restaurantId);

  return findItemInRestaurant(itemId, restaurantId);
};

// Soft delete: gone from the menu, kept for old orders [AC-MENU-09]
export const removeItem = async (restaurantId, itemId, ownerId) => {
  const item = await getMyItem(restaurantId, itemId, ownerId);

  await deleteItem(item);
  await clearCachedMenu(restaurantId);
};

// "Sold out" switch [AC-MENU-05]
export const setItemAvailability = async (restaurantId, itemId, ownerId, isAvailable) => {
  const item = await getMyItem(restaurantId, itemId, ownerId);

  await updateItem(item, { isAvailable });
  await clearCachedMenu(restaurantId);

  return findItemInRestaurant(itemId, restaurantId);
};
