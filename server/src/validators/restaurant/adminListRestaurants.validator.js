import { z } from "zod";
import { RESTAURANT_STATUSES } from "../../models/restaurant/restaurant.model.js";
import { paginationFields } from "../pagination.js";

// ?status=PENDING_APPROVAL&page=1&pageSize=20
export const adminListRestaurantsSchema = z
  .object({
    status: z.enum(RESTAURANT_STATUSES).optional(),
    ...paginationFields,
  })
  .strict();
