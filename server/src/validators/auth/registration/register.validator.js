import { z } from "zod";
import { emailField, passwordField, phoneField } from "../fields.js";

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Name is too short").max(100, "Name is too long"),
    email: emailField,
    phone: phoneField,
    password: passwordField,
    role: z.enum(["CUSTOMER", "RESTAURANT_OWNER", "RIDER"]).default("CUSTOMER"),
  })
  .strict();
