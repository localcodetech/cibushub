import { z } from "zod";

// The app makes one random key per "Place order" tap and sends it again on retries [AC-CHK-09]
// Headers arrive in lowercase. Other headers are ignored (no .strict() here).
export const idempotencyHeaderSchema = z.object({
  "idempotency-key": z
    .string("Send an Idempotency-Key header")
    .trim()
    .regex(/^[A-Za-z0-9_-]{8,64}$/, "Idempotency-Key must be 8 to 64 letters, digits, - or _"),
});
