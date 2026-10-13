import { api } from "@/lib/api";

// Every call an owner makes to build a restaurant's menu (the Step 6 endpoints).
// Prices are always whole pesewas; the menu builder turns GHS into pesewas before calling these.

const menuPath = (restaurantId) => "/owner/restaurants/" + restaurantId + "/menu";

// The full menu, sold-out dishes included: categories in order, each with its items
export const getOwnerMenuRequest = async (restaurantId) => {
  const result = await api.get(menuPath(restaurantId));
  return result.data;
};

// ─────────────────────────────────────────────
// Categories [AC-MENU-01, AC-MENU-02, AC-MENU-10]
// ─────────────────────────────────────────────

// A new category goes to the end of the menu
export const createCategoryRequest = async (restaurantId, name) => {
  const result = await api.post(menuPath(restaurantId) + "/categories", { name });
  return result.data;
};

// changes: { name?, displayOrder? }
export const updateCategoryRequest = async (restaurantId, categoryId, changes) => {
  const result = await api.patch(menuPath(restaurantId) + "/categories/" + categoryId, changes);
  return result.data;
};

// Only an empty category can go (409 CATEGORY_NOT_EMPTY otherwise)
export const deleteCategoryRequest = async (restaurantId, categoryId) => {
  const result = await api.delete(menuPath(restaurantId) + "/categories/" + categoryId);
  return result.data;
};

// Every dish in the category on sale (true) or sold out (false)
export const setCategoryAvailabilityRequest = async (restaurantId, categoryId, isAvailable) => {
  const result = await api.patch(
    menuPath(restaurantId) + "/categories/" + categoryId + "/availability",
    { isAvailable },
  );
  return result.data;
};

// ─────────────────────────────────────────────
// Dishes [AC-MENU-03 to AC-MENU-09]
// ─────────────────────────────────────────────

// item = { categoryId, name, description?, pricePesewas, tags, dailyStock, optionGroups }
export const createItemRequest = async (restaurantId, item) => {
  const result = await api.post(menuPath(restaurantId) + "/items", item);
  return result.data;
};

// Sending optionGroups replaces all of the dish's groups
export const updateItemRequest = async (restaurantId, itemId, changes) => {
  const result = await api.patch(menuPath(restaurantId) + "/items/" + itemId, changes);
  return result.data;
};

// Gone from the menu; old orders still show it
export const deleteItemRequest = async (restaurantId, itemId) => {
  const result = await api.delete(menuPath(restaurantId) + "/items/" + itemId);
  return result.data;
};

// On sale (true) or sold out (false), right now
export const setItemAvailabilityRequest = async (restaurantId, itemId, isAvailable) => {
  const result = await api.patch(menuPath(restaurantId) + "/items/" + itemId + "/availability", {
    isAvailable,
  });
  return result.data;
};

// file: the picked photo (form field "image")
export const uploadItemImageRequest = async (restaurantId, itemId, file) => {
  const form = new FormData();
  form.append("image", file);
  const result = await api.put(menuPath(restaurantId) + "/items/" + itemId + "/image", form);
  return result.data;
};
