import { z } from "zod";
import { isGhanaPhone } from "@/utils/phone";
import { passwordField } from "./fields";

// The sign-up form's rules. They match the server's rules
// (server/src/validators/auth/fields.js), so mistakes show before the form is sent [AC-AUTH-03]
export const registerSchema = z.object({
  role: z.enum(["CUSTOMER", "RESTAURANT_OWNER", "RIDER"]),
  fullName: z.string().trim().min(2, "Name is too short").max(100, "Name is too long"),
  phone: z.string().trim().refine(isGhanaPhone, "Enter a valid Ghana mobile number"),
  email: z.string().trim().pipe(z.email("Enter a valid email")),
  password: passwordField,
  // A ticked checkbox gives true. Only true is allowed.
  acceptTerms: z
    .boolean()
    .refine((value) => value === true, "Please accept the Terms and Privacy Policy"),
});
