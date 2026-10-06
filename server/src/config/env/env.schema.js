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

  OTP_SECRET: zod.string().min(32),
  JWT_ACCESS_SECRET: zod.string().min(32),

  SUPER_ADMIN_NAME: zod.string().min(1).optional(),
  SUPER_ADMIN_EMAIL: zod.email().optional(),
  SUPER_ADMIN_PHONE: zod.string().min(1).optional(),
  SUPER_ADMIN_PASSWORD: zod.string().min(8).optional(),
});
