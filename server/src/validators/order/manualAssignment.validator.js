import { z } from "zod";

const reasonField = z
  .string("Give a reason")
  .trim()
  .min(5, "Give a short reason")
  .max(300, "Reason is too long");

// Admin: give this order to this rider [AC-ASSIGN-07]
export const assignRiderSchema = z
  .object({
    riderProfileId: z.uuid("Choose a rider"),
    reason: reasonField,
  })
  .strict();

// Admin or rider: take the rider off, before pickup [AC-ASSIGN-08]
export const unassignRiderSchema = z.object({ reason: reasonField }).strict();
