import { z as zod } from "zod";

export const envSchema = zod.object({
  PORT: zod.coerce.number().int().positive(),
  NODE_ENV: zod.enum(["development", "test", "production"]),
  CLIENT_URL: zod.url(),

  DB_HOST: zod.string().min(1),
  DB_PORT: zod.coerce.number().int().positive().default(3306),
  MYSQL_DATABASE: zod.string().min(1),
  MYSQL_USER: zod.string().min(1),
  MYSQL_PASSWORD: zod.string().min(1),

  REDIS_URL: zod.url(),
});
