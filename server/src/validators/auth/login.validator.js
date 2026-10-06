import { z } from "zod";
import { normalizeGhanaPhone } from "../../utils/phone.js";

export const loginSchema = z
  .object({
    identifier: z
      .string()
      .trim()
      .min(1, "Enter your email or phone number")
      .transform((value) => {
        if (value.includes("@")) {
          return value.toLowerCase();
        }
        return normalizeGhanaPhone(value) || value;
      }),
    password: z.string().min(1, "Enter your password").max(72, "Password is too long"),
  })
  .strict();
