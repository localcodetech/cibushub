import { z } from "zod";
import { fullNameField } from "../auth/fields.js";

// Only the name is edited here; phone and email changes need a verification code [AC-CUST-01, AC-CUST-02]
export const updateProfileSchema = z
  .object({
    fullName: fullNameField,
  })
  .strict();
