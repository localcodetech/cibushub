import { z } from "zod";
import { ORDER_STATUSES } from "../../models/order/order.model.js";
import { paginationFields } from "../pagination.js";

const day = z.iso.date("Use a date like 2026-10-11");

// ?q=CH-2610&status=PICKED_UP&from=2026-10-01&to=2026-10-11&page=1 [AC-ADM-05]
//   q: an order number (or part of it), a customer phone, or a restaurant name
export const adminListOrdersSchema = z
  .object({
    q: z.string().trim().min(2, "Type at least 2 characters").max(100).optional(),
    status: z.enum(ORDER_STATUSES).optional(),
    from: day.optional(),
    to: day.optional(),
    restaurantId: z.uuid("Unknown restaurant").optional(),
    ...paginationFields,
  })
  .strict()
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    message: "The start date must be before the end date",
    path: ["from"],
  });
