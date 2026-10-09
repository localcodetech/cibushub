import { z } from "zod";

// Rules shared by several auth forms, written once.
// They match the server (server/src/validators/auth/fields.js) [AC-AUTH-03]

export const passwordField = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")
  .regex(/[A-Za-z]/, "Password must contain at least one letter")
  .regex(/[0-9]/, "Password must contain at least one number");

// The code from the SMS: exactly 6 digits
export const otpCodeField = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Enter the 6-digit code from the SMS");

// An email or a phone number, as on the login form
export const identifierField = z.string().trim().min(1, "Enter your email or phone number");
