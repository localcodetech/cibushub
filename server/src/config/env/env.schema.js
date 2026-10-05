import { z as zod } from "zod";

export const envSchema = zod.object({
  PORT: zod.coerce.number().int().positive(),
  NODE_ENV: zod.enum(["development", "test", "production"]),
  CLIENT_URL: zod.url(),
});
