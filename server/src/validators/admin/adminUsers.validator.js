import { z } from "zod";
import { paginationFields } from "../pagination.js";

const ROLES = ["CUSTOMER", "RESTAURANT_OWNER", "RIDER", "ADMIN", "SUPER_ADMIN"];
const STATUSES = ["PENDING_VERIFICATION", "PENDING_APPROVAL", "ACTIVE", "SUSPENDED"];

// ?q=ama&role=CUSTOMER&status=ACTIVE&page=1 [AC-ADM-02]
//   q: part of a name or email, or a phone in any format
export const adminListUsersSchema = z
  .object({
    q: z.string().trim().min(2, "Type at least 2 characters").max(100).optional(),
    role: z.enum(ROLES).optional(),
    status: z.enum(STATUSES).optional(),
    ...paginationFields,
  })
  .strict();

// Suspending and reactivating need a reason, for the audit log [AC-ADM-08]
export const userActionSchema = z
  .object({
    reason: z
      .string("Give a reason")
      .trim()
      .min(10, "Give a clear reason (at least 10 characters)")
      .max(500, "Reason is too long"),
  })
  .strict();
