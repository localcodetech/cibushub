import { z } from "zod";
import { emailField, fullNameField, passwordField, phoneField } from "../fields.js";

export const registerSchema = z
  .object({
    fullName: fullNameField,
    email: emailField,
    phone: phoneField,
    password: passwordField,
    role: z.enum(["CUSTOMER", "RESTAURANT_OWNER", "RIDER"]).default("CUSTOMER"),
  })
  .strict();
