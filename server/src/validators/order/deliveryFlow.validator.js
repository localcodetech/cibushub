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

// "Customer unreachable": an optional note, e.g. "Gate locked, nobody answers" [AC-DEL-08].
// No body at all counts as {}.
export const unreachableSchema = z
  .object({ note: z.string("Write a short note").trim().max(300, "Note is too long").optional() })
  .strict()
  .prefault({});

// Admin: unlock the code after checking with the customer [AC-DEL-06]
export const unlockDeliveryCodeSchema = z
  .object({
    reason: z
      .string("Give a reason")
      .trim()
      .min(5, "Give a short reason")
      .max(300, "Reason is too long"),
  })
  .strict();
