import { z } from "zod";

// The code from the SMS: exactly 6 digits, same rule as the server [AC-AUTH-03]
export const verifyPhoneSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from the SMS"),
});
