import { z } from "zod";
import {
  dailyStockField,
  displayOrderField,
  itemDescriptionField,
  itemNameField,
  optionGroupsField,
  pricePesewasField,
  tagsField,
} from "./fields.js";

const categoryIdField = z.uuid("Choose a valid category");

// [AC-MENU-03]
export const createItemSchema = z
  .object({
    categoryId: categoryIdField,
    name: itemNameField,
    description: itemDescriptionField.optional(),
    pricePesewas: pricePesewasField,
    tags: tagsField.default([]),
    isAvailable: z.boolean().default(true),
    dailyStock: dailyStockField.optional(),
    displayOrder: displayOrderField.optional(),
    optionGroups: optionGroupsField.default([]),
  })
  .strict();

// Only the fields sent are changed; sending optionGroups replaces all of them
export const updateItemSchema = z
  .object({
    categoryId: categoryIdField.optional(),
    name: itemNameField.optional(),
    description: itemDescriptionField.optional(),
    pricePesewas: pricePesewasField.optional(),
    tags: tagsField.optional(),
    dailyStock: dailyStockField.optional(),
    displayOrder: displayOrderField.optional(),
    optionGroups: optionGroupsField.optional(),
  })
  .strict()
  .refine((changes) => Object.keys(changes).length > 0, {
    message: "Send at least one field to change",
  });

// "Sold out" switch for one item [AC-MENU-05]
export const itemAvailabilitySchema = z
  .object({ isAvailable: z.boolean("Send true or false") })
  .strict();
