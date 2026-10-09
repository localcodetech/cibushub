import { z } from "zod";
import { fullNameField } from "../fields.js";

export const socialSignInSchema = z
  .object({
    provider: z.enum(["GOOGLE", "APPLE"]),
    // The signed token Google / Apple gave the browser
    idToken: z.string().min(1, "Missing sign-in token").max(4096),
    // Apple gives the name to the browser only on the first sign-in
    fullName: fullNameField.optional(),
    // Used only when this creates a new account
    role: z.enum(["CUSTOMER", "RESTAURANT_OWNER", "RIDER"]).optional(),
    acceptTerms: z.boolean().optional(),
  })
  .strict();
