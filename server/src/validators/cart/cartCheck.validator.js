import { z } from "zod";

const MAX_LINES = 50;

// One line of the cart, as the browser remembers it
const cartLineSchema = z
  .object({
    menuItemId: z.uuid("Invalid menu item"),
    quantity: z
      .number("Quantity must be a number")
      .int("Quantity must be a whole number")
      .min(1, "Quantity must be at least 1")
      .max(50, "Quantity must be at most 50"),
    optionIds: z
      .array(z.uuid("Invalid option"))
      .max(30)
      .default([])
      .refine((ids) => new Set(ids).size === ids.length, "Each option can be chosen once"),
    // The price the customer saw when they added it, to spot price changes [AC-CART-07]
    seenUnitPricePesewas: z.number().int().min(0),
  })
  .strict();

// [AC-CART-03, AC-CART-07]
export const cartCheckSchema = z
  .object({
    restaurantId: z.uuid("Invalid restaurant"),
    items: z
      .array(cartLineSchema)
      .min(1, "The cart is empty")
      .max(MAX_LINES, `At most ${MAX_LINES} lines`),
  })
  .strict();
