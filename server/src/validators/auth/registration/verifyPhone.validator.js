import { z } from "zod";
import { otpCodeField, phoneField } from "../fields.js";

export const verifyPhoneSchema = z
  .object({
    phone: phoneField,
    code: otpCodeField,
  })
  .strict();

export const resendOtpSchema = z
  .object({
    phone: phoneField,
  })
  .strict();
