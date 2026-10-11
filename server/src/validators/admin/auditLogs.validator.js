import { z } from "zod";
import { paginationFields } from "../pagination.js";

// What audit lines can be about
export const AUDIT_TARGET_TYPES = [
  "order",
  "payment",
  "refund",
  "restaurant",
  "review",
  "rider",
  "user",
  "setting",
];

const day = z.iso.date("Use a date like 2026-10-11");

// ?action=USER_SUSPENDED&targetType=user&targetId=...&actorId=...&from=2026-10-01&to=2026-10-11
export const listAuditLogsSchema = z
  .object({
    action: z
      .string()
      .trim()
      .regex(/^[A-Z_]{3,60}$/, "Unknown action")
      .optional(),
    targetType: z.enum(AUDIT_TARGET_TYPES).optional(),
    targetId: z.uuid("Unknown target").optional(),
    actorId: z.uuid("Unknown admin").optional(),
    from: day.optional(),
    to: day.optional(),
    ...paginationFields,
  })
  .strict()
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    message: "The start date must be before the end date",
    path: ["from"],
  });
