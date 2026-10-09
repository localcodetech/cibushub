import { z } from "zod";

// The address form, checked in the browser before sending [AC-CUST-03, AC-CUST-06].
// The map pin is not here: it lives outside the form and is checked on submit [AC-CUST-04].
// Empty optional fields are allowed here and left out of the request.
export const addressSchema = z.object({
  label: z.enum(["HOME", "WORK", "OTHER"], "Choose Home, Work or Other"),
  area: z.string().trim().max(100, "Area is too long"),
  // "ak-039-5028" or "AK-039-5028"; the server stores capitals
  ghanaPostGps: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^[A-Za-z]{2}-\d{3,4}-\d{4}$/.test(value),
      "Use the Ghana Post GPS format, e.g. AK-039-5028",
    ),
  landmark: z.string().trim().max(255, "Landmark is too long"),
  // Only the customer's own words. The server allows 500 in total; the quick notes use under 100
  deliveryInstructions: z.string().trim().max(400, "Instructions are too long"),
});
