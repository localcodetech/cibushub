import { z } from "zod";

// The login form's rules. They match the server's login rules
// (server/src/validators/auth/session/login.validator.js), so the user sees the
// same messages before the form is even sent [AC-AUTH-03]
export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your email or phone number"),
  password: z.string().min(1, "Enter your password").max(72, "Password is too long"),
});
