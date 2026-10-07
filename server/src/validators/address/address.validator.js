import { z } from "zod";
import { latitudeField, longitudeField } from "../restaurant/fields.js";

const labelField = z.enum(["HOME", "WORK", "OTHER"], "Choose Home, Work or Other");

// Ghana Post GPS digital address, e.g. AK-039-5028 (format only, not looked up)
const ghanaPostGpsField = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}-\d{3,4}-\d{4}$/, "Use the Ghana Post GPS format, e.g. AK-039-5028");

const areaField = z.string().trim().min(2, "Area is too short").max(100, "Area is too long");
const landmarkField = z.string().trim().max(255, "Landmark is too long");
const instructionsField = z.string().trim().max(500, "Instructions are too long");

// The map pin is required: riders navigate by coordinates [AC-CUST-03, AC-CUST-04]
export const createAddressSchema = z
  .object({
    label: labelField,
    latitude: latitudeField,
    longitude: longitudeField,
    ghanaPostGps: ghanaPostGpsField.optional(),
    area: areaField.optional(),
    landmark: landmarkField.optional(),
    deliveryInstructions: instructionsField.optional(),
  })
  .strict();

// Only the fields sent are changed; the pin can be moved but never removed
export const updateAddressSchema = z
  .object({
    label: labelField.optional(),
    latitude: latitudeField.optional(),
    longitude: longitudeField.optional(),
    ghanaPostGps: ghanaPostGpsField.optional(),
    area: areaField.optional(),
    landmark: landmarkField.optional(),
    deliveryInstructions: instructionsField.optional(),
  })
  .strict()
  .refine((changes) => Object.keys(changes).length > 0, {
    message: "Send at least one field to change",
  })
  .refine((changes) => (changes.latitude === undefined) === (changes.longitude === undefined), {
    message: "Move the pin by sending both latitude and longitude",
    path: ["latitude"],
  });
