import { z } from "zod";
import { emailField, fullNameField, passwordField, phoneField } from "../auth/fields.js";

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

const reasonField = z
  .string("Give a reason")
  .trim()
  .min(10, "Give a clear reason (at least 10 characters)")
  .max(500, "Reason is too long");

// A new admin account [AC-SADM-01]. The password is a first one to hand over in person;
// the new admin should change it after logging in.
export const createAdminSchema = z
  .object({
    fullName: fullNameField,
    email: emailField,
    phone: phoneField,
    password: passwordField,
    role: z.enum(ADMIN_ROLES).default("ADMIN"),
  })
  .strict();

// Admin <-> super admin
export const changeAdminRoleSchema = z
  .object({ role: z.enum(ADMIN_ROLES), reason: reasonField })
  .strict();

// Suspend, reactivate, remove
export const adminActionSchema = z.object({ reason: reasonField }).strict();
