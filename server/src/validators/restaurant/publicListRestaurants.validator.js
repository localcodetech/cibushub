import { z } from "zod";
import { paginationFields } from "../pagination.js";
import { latitudeField, longitudeField } from "./fields.js";

export const PUBLIC_SORT_OPTIONS = ["distance", "deliveryTime", "name", "newest"];

// ?q=jollof&cuisine=ghanaian&openNow=true&latitude=6.68&longitude=-1.62&sort=distance&page=1
export const publicListRestaurantsSchema = z
  .object({
    q: z.string().trim().min(2, "Type at least 2 letters to search").max(100).optional(),
    cuisine: z.string().trim().toLowerCase().min(2).max(30).optional(),
    // Query values are text, so "true"/"false" are turned into real booleans here
    openNow: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
    latitude: z.coerce.number().pipe(latitudeField).optional(),
    longitude: z.coerce.number().pipe(longitudeField).optional(),
    sort: z.enum(PUBLIC_SORT_OPTIONS).optional(),
    ...paginationFields,
  })
  .strict()
  .refine((query) => (query.latitude === undefined) === (query.longitude === undefined), {
    message: "Send both latitude and longitude, or neither",
    path: ["latitude"],
  })
  .refine((query) => query.sort !== "distance" || query.latitude !== undefined, {
    message: "Sorting by distance needs your location (latitude and longitude)",
    path: ["sort"],
  });
