import { z } from "zod";
import { normalizeGhanaPhone } from "../utils/phone.js";

export const emailField = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email"));

export const phoneField = z.string().transform((value, ctx) => {
  const phone = normalizeGhanaPhone(value);

  if (!phone) {
    ctx.addIssue({ code: "custom", message: "Enter a valid Ghana mobile number" });
    return z.NEVER;
  }

  return phone;
});

export const passwordField = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")
  .regex(/[A-Za-z]/, "Password must contain at least one letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Name is too short").max(100, "Name is too long"),
    email: emailField,
    phone: phoneField,
    password: passwordField,
    role: z.enum(["CUSTOMER", "RESTAURANT_OWNER", "RIDER"]).default("CUSTOMER"),
  })
  .strict();

export const verifyPhoneSchema = z
  .object({
    phone: phoneField,
    code: z.string().regex(/^\d{6}$/, "Code must be 6 digits"),
  })
  .strict();

export const resendOtpSchema = z
  .object({
    phone: phoneField,
  })
  .strict();
