import { listNotificationLogsSchema } from "../../validators/admin/notificationLog.validator.js";
import { listResponse, queryParameters } from "../helpers.js";

const exampleLog = {
  id: 42,
  channel: "EMAIL",
  template: "order.receipt",
  dedupeKey: "order:0f1e2d3c-4b5a-4968-8776-655443322110:receipt:email",
  recipientMasked: "am***@gmail.com",
  status: "FAILED",
  attempts: 3,
  providerMessageId: null,
  lastError: "UNREACHABLE",
  sentAt: null,
  createdAt: "2026-10-11T12:00:00.000Z",
  updatedAt: "2026-10-11T12:01:30.000Z",
};

export const adminNotificationPaths = {
  "/api/v1/admin/notifications": {
    get: {
      tags: ["Admin: Notifications"],
      summary: "Every email and SMS sent, newest first (e.g. ?status=FAILED)",
      description:
        "One row per message: channel, template, masked recipient, status (QUEUED, SENT, FAILED), attempts and the provider's id or last error. The message text is never stored. A message that fails 3 times (or is refused for good) is FAILED and admins get a live alert.",
      security: [{ cookieAuth: [] }],
      parameters: queryParameters(listNotificationLogsSchema),
      responses: { 200: listResponse("Notification log", exampleLog) },
    },
  },
};
