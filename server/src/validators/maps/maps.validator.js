import { z } from "zod";
import { latitudeField, longitudeField } from "../restaurant/fields.js";

// ?latitude=6.6745&longitude=-1.5716 (query values are text, so coerce turns them into numbers)
export const reverseGeocodeSchema = z
  .object({
    latitude: z.coerce.number().pipe(latitudeField),
    longitude: z.coerce.number().pipe(longitudeField),
  })
  .strict();

// ?q=KNUST main library
export const placeSearchSchema = z
  .object({
    q: z.string().trim().min(3, "Type at least 3 letters to search").max(100),
  })
  .strict();
