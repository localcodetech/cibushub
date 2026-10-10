import { z } from "zod";
import { paginationFields } from "../pagination.js";

// ?period=week&date=2026-10-10&page=1: the week that contains that day (today when left out)
export const riderEarningsSchema = z
  .object({
    period: z.enum(["day", "week", "month"], "Choose day, week or month").default("day"),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date like 2026-10-10")
      .optional(),
    ...paginationFields,
  })
  .strict();
