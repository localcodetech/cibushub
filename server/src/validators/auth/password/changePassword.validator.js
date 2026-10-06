import { z } from "zod";
import { passwordField } from "../fields.js";

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Enter your current password")
      .max(72, "Password is too long"),
    newPassword: passwordField,
  })
  .strict()
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "New password must be different from your current password",
    path: ["newPassword"],
  });
