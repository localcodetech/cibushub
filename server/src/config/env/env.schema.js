import { z as zod } from "zod";

export const envSchema = zod.object({
  PORT: zod.coerce.number().int().positive(),
  NODE_ENV: zod.enum(["development", "test", "production"]),
  CLIENT_URL: zod.url(),
  TRUST_PROXY: zod.coerce.number().int().min(0).default(0),
  // "true" only on demo.cibushubgh.com: demo data may be seeded there although it runs in
  // production mode. Never set it on the real site.
  DEMO_SITE: zod
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),

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

  // Sign in with Google / Apple / Facebook. Without these, that button's sign-in is switched off
  GOOGLE_CLIENT_ID: zod.string().optional(),
  APPLE_SERVICE_ID: zod.string().optional(),
  // Facebook also needs the app secret: the server asks Facebook whether a token is ours
  FACEBOOK_APP_ID: zod.string().optional(),
  FACEBOOK_APP_SECRET: zod.string().optional(),

  // SMS through Nalo Solutions. Without a key, messages are only printed (development)
  NALO_API_KEY: zod.string().optional(),
  NALO_SENDER_ID: zod.string().max(11, "NALO_SENDER_ID can be at most 11 characters").optional(),

  // Email through Resend. Without a key, emails are only printed (development).
  // EMAIL_FROM must use a domain verified in Resend, e.g. "CibusHub <noreply@cibushubgh.com>"
  // (An empty value, e.g. "RESEND_API_KEY=" in .env, means "not set")
  RESEND_API_KEY: zod
    .string()
    .startsWith("re_", "RESEND_API_KEY must start with re_")
    .or(zod.literal(""))
    .optional(),
  EMAIL_FROM: zod.string().min(3).default("CibusHub <noreply@cibushubgh.com>"),
  // The signing secret of the Resend webhook (bounces), from Resend's Webhooks page.
  // Without it every webhook call is refused.
  RESEND_WEBHOOK_SECRET: zod
    .string()
    .startsWith("whsec_", "RESEND_WEBHOOK_SECRET must start with whsec_")
    .or(zod.literal(""))
    .optional(),
  // Where customers' replies go (optional), e.g. support@cibushubgh.com
  EMAIL_REPLY_TO: zod.email().or(zod.literal("")).optional(),

  // Maps lookups (pin -> area name, place search) through OpenStreetMap's Nominatim. Free, no key.
  // Their rules ask every app to say who it is, so we send this email with each request.
  GEOCODER_URL: zod.url().default("https://nominatim.openstreetmap.org"),
  GEOCODER_CONTACT_EMAIL: zod.email().or(zod.literal("")).optional(),

  // Sentry crash reports (production only). From Sentry → Project settings → Client Keys (DSN)
  SENTRY_DSN: zod.url().or(zod.literal("")).optional(),

  SUPER_ADMIN_NAME: zod.string().min(1).optional(),
  SUPER_ADMIN_EMAIL: zod.email().optional(),
  SUPER_ADMIN_PHONE: zod.string().min(1).optional(),
  SUPER_ADMIN_PASSWORD: zod.string().min(8).optional(),
});
