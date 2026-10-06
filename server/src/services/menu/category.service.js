import AppError from "../../utils/AppError.js";
import { getMyEditableRestaurant } from "../restaurant/myRestaurants.service.js";
import {
  countItemsInCategory,
  createCategory,
  deleteCategory,
  findCategoryInRestaurant,
  findHighestCategoryOrder,
  setAvailabilityForCategory,
  updateCategory,
} from "../../repositories/menu.repository.js";

// Finds a category only inside the owner's own restaurant
const getMyCategory = async (restaurantId, categoryId, ownerId) => {
  await getMyEditableRestaurant(restaurantId, ownerId);

  const category = await findCategoryInRestaurant(categoryId, restaurantId);

  if (!category) {
    throw new AppError(404, "NOT_FOUND", "Category not found");
  }

  return category;
};

export const addCategory = async (restaurantId, ownerId, data) => {
  await getMyEditableRestaurant(restaurantId, ownerId);

  // No position given → put it at the end of the menu
  let displayOrder = data.displayOrder;
  if (displayOrder === undefined) {
    const highestOrder = await findHighestCategoryOrder(restaurantId);
    displayOrder = highestOrder === null ? 0 : highestOrder + 1;
  }

  return createCategory({ restaurantId, name: data.name, displayOrder });
};

export const editCategory = async (restaurantId, categoryId, ownerId, changes) => {
  const category = await getMyCategory(restaurantId, categoryId, ownerId);

  return updateCategory(category, changes);
};

export const removeCategory = async (restaurantId, categoryId, ownerId) => {
  const category = await getMyCategory(restaurantId, categoryId, ownerId);

  // Items are never silently orphaned [AC-MENU-02]
  const itemCount = await countItemsInCategory(categoryId);
  if (itemCount > 0) {
    throw new AppError(
      409,
      "CATEGORY_NOT_EMPTY",
      `This category still has ${itemCount} item(s). Move or delete them first`,
    );
  }

  await deleteCategory(category);
};

export const setCategoryAvailability = async (restaurantId, categoryId, ownerId, isAvailable) => {
  await getMyCategory(restaurantId, categoryId, ownerId);

  const [itemsChanged] = await setAvailabilityForCategory(categoryId, isAvailable);

  return { itemsChanged };
};
