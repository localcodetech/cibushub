import { z } from "zod";
import { MENU_ITEM_TAGS } from "../../models/menu/menuItem.model.js";

// Whole pesewas above zero: 4550 = GHS 45.50 [AC-MENU-04]
export const pricePesewasField = z
  .number("Price must be a number in pesewas")
  .int("Price must be in whole pesewas (e.g. 4550 for GHS 45.50)")
  .positive("Price must be more than 0")
  .max(10000000, "Price is too high");

// Options may be free (0), but never negative or decimal
export const extraPricePesewasField = z
  .number()
  .int("Extra price must be in whole pesewas")
  .min(0, "Extra price cannot be negative")
  .max(10000000, "Extra price is too high");

export const categoryNameField = z
  .string()
  .trim()
  .min(2, "Category name is too short")
  .max(80, "Category name is too long");

export const itemNameField = z
  .string()
  .trim()
  .min(2, "Item name is too short")
  .max(120, "Item name is too long");

export const itemDescriptionField = z.string().trim().max(1000, "Description is too long");

export const tagsField = z.array(z.enum(MENU_ITEM_TAGS)).max(MENU_ITEM_TAGS.length);

export const displayOrderField = z.number().int().min(0).max(10000);

// null = no stock tracking (unlimited)
export const dailyStockField = z.number().int().min(1).max(10000).nullable();

const optionSchema = z
  .object({
    name: z.string().trim().min(1, "Option name is required").max(80, "Option name is too long"),
    extraPricePesewas: extraPricePesewasField.default(0),
    isAvailable: z.boolean().default(true),
  })
  .strict();

// "Protein: choose 1" or "Extras: up to 3" [AC-MENU-06]
const optionGroupSchema = z
  .object({
    name: z.string().trim().min(2, "Group name is too short").max(80, "Group name is too long"),
    minSelect: z.number().int().min(0).default(0),
    maxSelect: z.number().int().min(1).default(1),
    options: z.array(optionSchema).min(1, "A group needs at least one option").max(20),
  })
  .strict()
  .refine((group) => group.maxSelect >= group.minSelect, {
    message: "Maximum choices cannot be less than minimum choices",
    path: ["maxSelect"],
  })
  .refine((group) => group.maxSelect <= group.options.length, {
    message: "Maximum choices cannot be more than the number of options",
    path: ["maxSelect"],
  });

export const optionGroupsField = z.array(optionGroupSchema).max(10, "At most 10 option groups");
