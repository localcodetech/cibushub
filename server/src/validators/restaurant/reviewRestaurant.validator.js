import { z } from "zod";

const reasonField = z
  .string()
  .trim()
  .min(10, "Give a clear reason (at least 10 characters)")
  .max(500, "Reason is too long");

export const rejectRestaurantSchema = z.object({ reason: reasonField }).strict();

export const suspendRestaurantSchema = z.object({ reason: reasonField }).strict();
