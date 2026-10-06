import { Router } from "express";
import requireActive from "../../middlewares/requireActive.js";
import validate from "../../middlewares/validate.js";
import {
  categoryAvailabilitySchema,
  createCategorySchema,
  updateCategorySchema,
} from "../../validators/menu/category.validator.js";
import {
  createItemSchema,
  itemAvailabilitySchema,
  updateItemSchema,
} from "../../validators/menu/item.validator.js";
import { getMenu } from "../../controllers/menu/menu.controller.js";
import {
  createCategory,
  deleteCategory,
  updateCategory,
  updateCategoryAvailability,
} from "../../controllers/menu/category.controller.js";
import {
  createItem,
  deleteItem,
  updateItem,
  updateItemAvailability,
} from "../../controllers/menu/item.controller.js";

// mergeParams: lets these routes read :restaurantId from the path in app.js
const router = Router({ mergeParams: true });

// ─────────────────────────────────────────────
// Menu management is an operational feature: approved (ACTIVE) owners only
// ─────────────────────────────────────────────
router.use(requireActive);

// ─────────────────────────────────────────────
// The full menu, including sold-out items
// ─────────────────────────────────────────────
router.get("/", getMenu);

// ─────────────────────────────────────────────
// Add a category
// ─────────────────────────────────────────────
router.post("/categories", validate(createCategorySchema), createCategory);

// ─────────────────────────────────────────────
// Rename or move a category
// ─────────────────────────────────────────────
router.patch("/categories/:categoryId", validate(updateCategorySchema), updateCategory);

// ─────────────────────────────────────────────
// Delete an empty category (409 if it still has items)
// ─────────────────────────────────────────────
router.delete("/categories/:categoryId", deleteCategory);

// ─────────────────────────────────────────────
// Mark every item in a category available or sold out
// ─────────────────────────────────────────────
router.patch(
  "/categories/:categoryId/availability",
  validate(categoryAvailabilitySchema),
  updateCategoryAvailability,
);

// ─────────────────────────────────────────────
// Add an item, with its option groups
// ─────────────────────────────────────────────
router.post("/items", validate(createItemSchema), createItem);

// ─────────────────────────────────────────────
// Edit an item (sending optionGroups replaces them all)
// ─────────────────────────────────────────────
router.patch("/items/:itemId", validate(updateItemSchema), updateItem);

// ─────────────────────────────────────────────
// Delete an item (soft delete, kept for old orders)
// ─────────────────────────────────────────────
router.delete("/items/:itemId", deleteItem);

// ─────────────────────────────────────────────
// Mark one item available or sold out
// ─────────────────────────────────────────────
router.patch(
  "/items/:itemId/availability",
  validate(itemAvailabilitySchema),
  updateItemAvailability,
);

export default router;
