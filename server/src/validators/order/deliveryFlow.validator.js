import { z } from "zod";

// "Picked up": confirmFarAway is true only after the rider saw the 200 m warning [AC-DEL-03].
// No body at all counts as {} (not confirmed).
export const pickupSchema = z
  .object({ confirmFarAway: z.boolean("Answer yes or no").optional().default(false) })
  .strict()
  .prefault({});

// "Delivered": the customer's 4-digit code [AC-DEL-06]
export const completeDeliverySchema = z
  .object({ code: z.string("Enter the code").regex(/^\d{4}$/, "Enter the 4-digit code") })
  .strict();
