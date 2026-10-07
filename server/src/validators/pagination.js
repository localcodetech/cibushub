import { z } from "zod";

// ?page=2&pageSize=20 — query values arrive as text, so coerce turns "2" into 2 [AC-GLOBAL-04]
export const paginationFields = {
  page: z.coerce.number().int().min(1, "Page starts at 1").default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1, "Page size must be at least 1")
    .max(100, "Page size must be at most 100")
    .default(20),
};
