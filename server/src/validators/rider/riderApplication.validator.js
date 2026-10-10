import { z } from "zod";
import { MOTORISED_VEHICLES, VEHICLE_TYPES } from "../../models/rider/riderProfile.model.js";
import { RIDER_DOCUMENT_TYPES } from "../../models/rider/riderDocument.model.js";

// Vehicle and Ghana Card details [AC-RIDER-01].
// Typed in any case and spacing; saved in capitals, e.g. "gha-123456789-0" -> "GHA-123456789-0"
export const riderDetailsSchema = z
  .object({
    vehicleType: z.enum(VEHICLE_TYPES, "Choose motorbike, bicycle or car"),
    plateNumber: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9][A-Z0-9 -]{3,18}$/, "Enter the plate number, e.g. GR 1234-21")
      .optional(),
    ghanaCardNumber: z
      .string("Enter your Ghana Card number")
      .trim()
      .toUpperCase()
      .regex(/^GHA-\d{9}-\d$/, "Use the format on your card, e.g. GHA-123456789-0"),
  })
  .strict()
  // Motorbikes and cars must have a plate; bicycles don't
  .refine((details) => !MOTORISED_VEHICLES.includes(details.vehicleType) || details.plateNumber, {
    message: "Enter the plate number",
    path: ["plateNumber"],
  });

// /documents/GHANA_CARD -> the type must be one we know
export const riderDocumentParamsSchema = z.object({
  documentType: z.enum(RIDER_DOCUMENT_TYPES),
});
