import { z } from "zod";
import { phoneField } from "../fields.js";

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
