import { z } from "zod";
import { categoryNameField, displayOrderField } from "./fields.js";

export const createCategorySchema = z
  .object({
    name: categoryNameField,
    displayOrder: displayOrderField.optional(),
  })
  .strict();

// Rename and/or move [AC-MENU-01]
export const updateCategorySchema = z
  .object({
    name: categoryNameField.optional(),
    displayOrder: displayOrderField.optional(),
  })
  .strict()
  .refine((changes) => Object.keys(changes).length > 0, {
    message: "Send at least one field to change",
  });

// Mark every item in the category sold out, or back on sale [AC-MENU-10]
export const categoryAvailabilitySchema = z
  .object({ isAvailable: z.boolean("Send true or false") })
  .strict();
