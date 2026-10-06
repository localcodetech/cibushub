import { z } from "zod";
import { identifierField, otpCodeField, passwordField } from "../fields.js";

export const resetPasswordSchema = z
  .object({
    identifier: identifierField,
    code: otpCodeField,
    newPassword: passwordField,
  })
  .strict();
