import { z } from "zod";

// Deleting my account [AC-CUST-11]: the word DELETE typed out, so it can't happen by a slip,
// and my password (left out only by a Google / Apple account that never set one; the
// service checks that)
export const deleteAccountSchema = z
  .object({
    confirmText: z.literal("DELETE", { error: "Type DELETE to confirm" }),
    password: z.string().max(72, "Password is too long").optional(),
  })
  .strict();
