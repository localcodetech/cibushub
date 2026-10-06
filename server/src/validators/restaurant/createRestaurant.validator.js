import { z } from "zod";
import { phoneField } from "../auth/fields.js";
import {
  cuisineTagsField,
  deliveryRadiusKmField,
  latitudeField,
  longitudeField,
  minOrderPesewasField,
  openingHoursField,
  prepTimeMinutesField,
} from "./fields.js";

export const createRestaurantSchema = z
  .object({
    name: z.string().trim().min(2, "Name is too short").max(120, "Name is too long"),
    legalName: z
      .string()
      .trim()
      .min(2, "Legal name is too short")
      .max(160, "Legal name is too long"),
    description: z.string().trim().max(1000, "Description is too long").optional(),
    phone: phoneField,
    cuisineTags: cuisineTagsField,
    addressLine: z.string().trim().min(3, "Address is too short").max(255, "Address is too long"),
    area: z.string().trim().min(2, "Area is too short").max(80, "Area is too long"),
    city: z.string().trim().min(2).max(80).default("Kumasi"),
    latitude: latitudeField,
    longitude: longitudeField,
    openingHours: openingHoursField,
    minOrderPesewas: minOrderPesewasField.default(0),
    deliveryRadiusKm: deliveryRadiusKmField.default(5),
    prepTimeMinutes: prepTimeMinutesField.default(20),
  })
  .strict();
