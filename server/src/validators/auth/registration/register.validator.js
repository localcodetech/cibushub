import { z } from "zod";
import { emailField, fullNameField, passwordField, phoneField } from "../fields.js";

export const registerSchema = z
  .object({
    fullName: fullNameField,
    email: emailField,
    phone: phoneField,
    password: passwordField,
    role: z.enum(["CUSTOMER", "RESTAURANT_OWNER", "RIDER"]).default("CUSTOMER"),
    // The sign-up checkbox: must be ticked (true) [plan-review §3]
    acceptTerms: z
      .boolean({ error: "Please accept the Terms and Privacy Policy" })
      .refine((value) => value === true, "Please accept the Terms and Privacy Policy"),
    // "Send me offers and news": optional, unticked unless they choose it [AC-NOTIF-09]
    marketingOptIn: z.boolean().default(false),
  })
  .strict();
