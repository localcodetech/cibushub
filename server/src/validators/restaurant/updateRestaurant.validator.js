import { z } from "zod";
import { phoneField } from "../auth/fields.js";
import {
  addressLineField,
  areaField,
  cityField,
  cuisineTagsField,
  deliveryRadiusKmField,
  descriptionField,
  latitudeField,
  legalNameField,
  longitudeField,
  minOrderPesewasField,
  nameField,
  prepTimeMinutesField,
} from "./fields.js";

// Every field is optional: the owner only sends what they want to change
export const updateRestaurantSchema = z
  .object({
    name: nameField.optional(),
    legalName: legalNameField.optional(),
    description: descriptionField.optional(),
    phone: phoneField.optional(),
    cuisineTags: cuisineTagsField.optional(),
    addressLine: addressLineField.optional(),
    area: areaField.optional(),
    city: cityField.optional(),
    latitude: latitudeField.optional(),
    longitude: longitudeField.optional(),
    minOrderPesewas: minOrderPesewasField.optional(),
    deliveryRadiusKm: deliveryRadiusKmField.optional(),
    prepTimeMinutes: prepTimeMinutesField.optional(),
  })
  .strict()
  .refine((changes) => Object.keys(changes).length > 0, {
    message: "Send at least one field to change",
  });
