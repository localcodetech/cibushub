import { z } from "zod";

// 24-hour time like "08:00" or "23:30"
const timeField = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour time like 08:00 or 23:30");

const dayHoursSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    isClosed: z.boolean(),
    opensAt: timeField.nullable().optional(),
    closesAt: timeField.nullable().optional(),
  })
  .strict()
  .refine((day) => day.isClosed || (day.opensAt && day.closesAt), {
    message: "Give opening and closing times, or mark the day as closed",
    path: ["opensAt"],
  })
  .refine((day) => day.isClosed || day.opensAt !== day.closesAt, {
    message: "Opening and closing times cannot be the same",
    path: ["closesAt"],
  });

export const openingHoursField = z
  .array(dayHoursSchema)
  .length(7, "Give hours for all 7 days of the week")
  .refine((days) => new Set(days.map((day) => day.dayOfWeek)).size === 7, {
    message: "Each day of the week must appear exactly once",
  });

export const cuisineTagsField = z
  .array(z.string().trim().toLowerCase().min(2).max(30))
  .min(1, "Pick at least one cuisine")
  .max(10, "Pick at most 10 cuisines");

// Ghana sits roughly between latitude 4.5 and 11.2, longitude -3.3 and 1.3
export const latitudeField = z
  .number()
  .min(4.5, "The map pin must be inside Ghana")
  .max(11.2, "The map pin must be inside Ghana");
export const longitudeField = z
  .number()
  .min(-3.3, "The map pin must be inside Ghana")
  .max(1.3, "The map pin must be inside Ghana");

export const minOrderPesewasField = z
  .number()
  .int("Amount must be in whole pesewas")
  .min(0, "Minimum order cannot be negative");

export const deliveryRadiusKmField = z
  .number()
  .min(1, "Delivery radius must be at least 1 km")
  .max(30, "Delivery radius must be at most 30 km");

export const prepTimeMinutesField = z
  .number()
  .int()
  .min(5, "Preparation time must be at least 5 minutes")
  .max(120, "Preparation time must be at most 120 minutes");
