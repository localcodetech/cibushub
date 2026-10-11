import { z } from "zod";
import { paginationFields } from "../pagination.js";
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUSES,
} from "../../models/notification/notificationLog.model.js";

// ?status=FAILED&channel=SMS&page=1 [AC-NOTIF-03, AC-NOTIF-08]
export const listNotificationLogsSchema = z
  .object({
    status: z.enum(NOTIFICATION_STATUSES).optional(),
    channel: z.enum(NOTIFICATION_CHANNELS).optional(),
    ...paginationFields,
  })
  .strict();
