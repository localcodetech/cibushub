import { z } from "zod";
import { RIDER_STATUSES } from "../../models/rider/riderProfile.model.js";
import { paginationFields } from "../pagination.js";

const reasonField = z
  .string("Give a reason")
  .trim()
  .min(10, "Give a clear reason (at least 10 characters)")
  .max(500, "Reason is too long");

// ?status=PENDING_APPROVAL&page=1&pageSize=20
export const adminListRidersSchema = z
  .object({
    status: z.enum(RIDER_STATUSES).optional(),
    ...paginationFields,
  })
  .strict();

export const rejectRiderSchema = z.object({ reason: reasonField }).strict();

export const suspendRiderSchema = z.object({ reason: reasonField }).strict();
