import { z } from "zod";
import { cartLineSchema } from "../cart/cartCheck.validator.js";

const noteField = z.string().trim().max(500, "Note is too long");

// What the checkout page sends: the cart, which saved address, and two optional notes
// Prices are never sent: the server works them out [AC-CHK-02]
export const checkoutQuoteSchema = z
  .object({
    restaurantId: z.uuid("Invalid restaurant"),
    addressId: z.uuid("Choose a delivery address"),
    items: z.array(cartLineSchema).min(1, "The cart is empty").max(50, "At most 50 lines"),
    restaurantNote: noteField.optional(), // "less pepper"
    riderNote: noteField.optional(), // "call when you reach the gate"
    // When placing: the total the checkout page showed, so a fee change can't surprise anyone
    seenTotalPesewas: z.number().int().min(0).optional(),
  })
  .strict();
