import { listNotificationLogs } from "../../services/notifications/notificationLog.service.js";
import { sendSuccess } from "../../utils/response.js";

export const listNotifications = async (req, res) => {
  const { logs, meta } = await listNotificationLogs(req.validated.query);

  return sendSuccess(res, logs, 200, meta);
};
