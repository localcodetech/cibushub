import {
  listMyNotifications,
  readAllNotifications,
  readNotification,
} from "../../services/notifications/inApp.service.js";
import { sendSuccess } from "../../utils/response.js";

export const listNotifications = async (req, res) => {
  const { notifications, meta } = await listMyNotifications(req.user.id, req.validated.query);

  return sendSuccess(res, notifications, 200, meta);
};

export const markNotificationRead = async (req, res) => {
  const result = await readNotification(req.validated.params.notificationId, req.user.id);

  return sendSuccess(res, result);
};

export const markAllNotificationsRead = async (req, res) => {
  const result = await readAllNotifications(req.user.id);

  return sendSuccess(res, result);
};
