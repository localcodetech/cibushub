import { z } from "zod";
import { paginationFields } from "../pagination.js";
import { ORDER_STATUSES } from "../../models/order/order.model.js";

// ?page=1&pageSize=20&status=DELIVERED
export const listMyOrdersSchema = z
  .object({
    status: z.enum(ORDER_STATUSES).optional(),
    ...paginationFields,
  })
  .strict();

// The customer must say why [AC-CANC-01]
export const cancelOrderSchema = z
  .object({
    reason: z
      .string()
      .trim()
      .min(3, "Tell us briefly why you are cancelling")
      .max(500, "Reason is too long"),
  })
  .strict();
