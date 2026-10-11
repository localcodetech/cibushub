import { z } from "zod";
import { fullNameField } from "../auth/fields.js";

// Only the name is edited here; phone and email changes need a verification code [AC-CUST-01, AC-CUST-02]
// My notification settings [AC-NOTIF-09]. Only marketing can be switched off:
// codes, receipts and order updates are always sent.
export const updatePreferencesSchema = z
  .object({
    marketingOptIn: z.boolean({ error: "Choose yes or no" }),
  })
  .strict();

export const updateProfileSchema = z
  .object({
    fullName: fullNameField,
  })
  .strict();
