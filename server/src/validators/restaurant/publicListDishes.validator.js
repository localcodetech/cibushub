import { z } from "zod";
import { paginationFields } from "../pagination.js";
import { latitudeField, longitudeField } from "./fields.js";

// ?q=jollof&openNow=true&latitude=6.68&longitude=-1.62&page=1
// The words are required: the dish search answers "who cooks this?"
export const publicListDishesSchema = z
  .object({
    q: z
      .string({ error: "Type the dish you are looking for" })
      .trim()
      .min(2, "Type at least 2 letters to search")
      .max(100),
    // Query values are text, so "true"/"false" are turned into real booleans here
    openNow: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
    latitude: z.coerce.number().pipe(latitudeField).optional(),
    longitude: z.coerce.number().pipe(longitudeField).optional(),
    ...paginationFields,
  })
  .strict()
  .refine((query) => (query.latitude === undefined) === (query.longitude === undefined), {
    message: "Send both latitude and longitude, or neither",
    path: ["latitude"],
  });
