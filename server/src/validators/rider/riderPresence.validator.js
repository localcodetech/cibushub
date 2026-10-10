import { z } from "zod";

// Going online needs the phone's current position [AC-RIDER-04]
export const goOnlineSchema = z
  .object({
    latitude: z.number("Location is required").min(-90).max(90),
    longitude: z.number("Location is required").min(-180).max(180),
    // How sure the phone is, in metres (the browser reports it)
    accuracyMetres: z.number().min(0).optional(),
  })
  .strict();
