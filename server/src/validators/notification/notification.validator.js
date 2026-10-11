import { z } from "zod";
import { paginationFields } from "../pagination.js";

// ?page=1&pageSize=20
export const listMyNotificationsSchema = z.object({ ...paginationFields }).strict();

// /notifications/42/read
export const notificationParamsSchema = z.object({
  notificationId: z.coerce.number().int().positive("Unknown notification"),
});
