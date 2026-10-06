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
  openingHoursField,
  prepTimeMinutesField,
} from "./fields.js";

export const createRestaurantSchema = z
  .object({
    name: nameField,
    legalName: legalNameField,
    description: descriptionField.optional(),
    phone: phoneField,
    cuisineTags: cuisineTagsField,
    addressLine: addressLineField,
    area: areaField,
    city: cityField.default("Kumasi"),
    latitude: latitudeField,
    longitude: longitudeField,
    openingHours: openingHoursField,
    minOrderPesewas: minOrderPesewasField.default(0),
    deliveryRadiusKm: deliveryRadiusKmField.default(5),
    prepTimeMinutes: prepTimeMinutesField.default(20),
  })
  .strict();
