import { z } from "zod";
import { otpCodeField, passwordField } from "./fields";

// Reset password: the SMS code, and the new password typed twice [AC-AUTH-19]
export const resetPasswordSchema = z
  .object({
    code: otpCodeField,
    newPassword: passwordField,
    confirmPassword: z.string().min(1, "Type your new password again"),
  })
  // A check that needs two fields at once. path: which field shows the message.
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "The two passwords don't match",
    path: ["confirmPassword"],
  });
