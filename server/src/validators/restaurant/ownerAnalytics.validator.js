import { z } from "zod";
import { dateRangeSchema } from "../admin/analytics.validator.js";

// ?restaurantId=...&from=2026-10-01&to=2026-10-11 [AC-ANL-03]
export const ownerAnalyticsSchema = dateRangeSchema({
  restaurantId: z.uuid("Unknown restaurant"),
});
