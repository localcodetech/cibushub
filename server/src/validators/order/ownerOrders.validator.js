import { z } from "zod";
import { paginationFields } from "../pagination.js";
import { ORDER_STATUSES } from "../../models/order/order.model.js";

// "2026-10-10": a day, read in Ghana time
const dayField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date like 2026-10-10");

// ?restaurantId=... to look at one restaurant; all of mine without it
const restaurantFilter = { restaurantId: z.uuid("Invalid restaurant").optional() };

export const ownerBoardSchema = z.object(restaurantFilter).strict();

// Accept, optionally saying how long it will take [AC-RORD-03]
export const acceptOrderSchema = z
  .object({
    prepTimeMinutes: z
      .number("Preparation time must be a number")
      .int("Use whole minutes")
      .min(5, "At least 5 minutes")
      .max(180, "At most 3 hours")
      .optional(),
  })
  .strict()
  // "Accept" with nothing sent: use the restaurant's usual preparation time
  .default({});

// Reject: the reason is required, the customer sees it [AC-RORD-03]
export const rejectOrderSchema = z
  .object({
    reason: z
      .string("Give a reason")
      .trim()
      .min(3, "Tell the customer briefly why")
      .max(300, "Reason is too long"),
  })
  .strict();

// ?from=2026-10-01&to=2026-10-10&status=DELIVERED&page=1 [AC-RORD-07]
export const ownerHistorySchema = z
  .object({
    ...restaurantFilter,
    status: z.enum(ORDER_STATUSES).optional(),
    from: dayField.optional(),
    to: dayField.optional(),
    ...paginationFields,
  })
  .strict()
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    message: "'from' must be on or before 'to'",
    path: ["from"],
  });

// ?date=2026-10-10 (today when left out)
export const ownerSummarySchema = z
  .object({ ...restaurantFilter, date: dayField.optional() })
  .strict();
