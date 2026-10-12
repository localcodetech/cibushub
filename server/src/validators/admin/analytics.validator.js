import { z } from "zod";

const day = z.iso.date("Use a date like 2026-10-11");
const DAY_MS = 24 * 60 * 60 * 1000;
// About three months: enough for any report, small enough to stay fast [AC-ANL-06]
export const MAX_RANGE_DAYS = 92;

// ?from=2026-10-01&to=2026-10-11 (Ghana days, both included) [AC-ANL-01]
export const analyticsRangeSchema = z
  .object({ from: day, to: day })
  .strict()
  .refine((query) => query.from <= query.to, {
    message: "The start date must be before the end date",
    path: ["from"],
  })
  .refine(
    (query) =>
      (new Date(query.to).getTime() - new Date(query.from).getTime()) / DAY_MS < MAX_RANGE_DAYS,
    { message: `Choose ${MAX_RANGE_DAYS} days or fewer`, path: ["to"] },
  );
