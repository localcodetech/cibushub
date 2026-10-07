import { z as zod } from "zod";

export const envSchema = zod.object({
  PORT: zod.coerce.number().int().positive(),
  NODE_ENV: zod.enum(["development", "test", "production"]),
  CLIENT_URL: zod.url(),
  TRUST_PROXY: zod.coerce.number().int().min(0).default(0),

  DB_HOST: zod.string().min(1),
  DB_PORT: zod.coerce.number().int().positive().default(3306),
  MYSQL_DATABASE: zod.string().min(1),
  MYSQL_USER: zod.string().min(1),
  MYSQL_PASSWORD: zod.string().min(1),

  REDIS_URL: zod.url(),

  OTP_SECRET: zod.string().min(32),
  JWT_ACCESS_SECRET: zod.string().min(32),

  CLOUDINARY_CLOUD_NAME: zod.string().min(1),
  CLOUDINARY_API_KEY: zod.string().min(1),
  CLOUDINARY_API_SECRET: zod.string().min(1),

  // Server only, never sent to the browser [AC-PAY-03]
  PAYSTACK_SECRET_KEY: zod.string().startsWith("sk_", "PAYSTACK_SECRET_KEY must start with sk_"),
  PAYSTACK_BASE_URL: zod.url().default("https://api.paystack.co"),

  SUPER_ADMIN_NAME: zod.string().min(1).optional(),
  SUPER_ADMIN_EMAIL: zod.email().optional(),
  SUPER_ADMIN_PHONE: zod.string().min(1).optional(),
  SUPER_ADMIN_PASSWORD: zod.string().min(8).optional(),
});
