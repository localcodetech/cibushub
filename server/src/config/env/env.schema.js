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

  // Sign in with Google / Apple. Without these, that button's sign-in is switched off
  GOOGLE_CLIENT_ID: zod.string().optional(),
  APPLE_SERVICE_ID: zod.string().optional(),

  // SMS through Nalo Solutions. Without a key, messages are only printed (development)
  NALO_API_KEY: zod.string().optional(),
  NALO_SENDER_ID: zod.string().max(11, "NALO_SENDER_ID can be at most 11 characters").optional(),

  // Maps lookups (pin -> area name, place search) through OpenStreetMap's Nominatim. Free, no key.
  // Their rules ask every app to say who it is, so we send this email with each request.
  GEOCODER_URL: zod.url().default("https://nominatim.openstreetmap.org"),
  GEOCODER_CONTACT_EMAIL: zod.email().or(zod.literal("")).optional(),

  SUPER_ADMIN_NAME: zod.string().min(1).optional(),
  SUPER_ADMIN_EMAIL: zod.email().optional(),
  SUPER_ADMIN_PHONE: zod.string().min(1).optional(),
  SUPER_ADMIN_PASSWORD: zod.string().min(8).optional(),
});
