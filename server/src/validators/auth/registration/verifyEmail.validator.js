import { z } from "zod";
import { otpCodeField } from "../fields.js";

export const verifyEmailSchema = z
  .object({
    code: otpCodeField,
  })
  .strict();
