import { Router } from "express";
import validate from "../middlewares/validate.js";
import {
  listMyNotificationsSchema,
  notificationParamsSchema,
} from "../validators/notification/notification.validator.js";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../controllers/notification/notification.controller.js";

const router = Router();

// ─────────────────────────────────────────────
// My notifications, newest first; meta.unreadCount is the number on the bell
// ─────────────────────────────────────────────
router.get("/", validate(listMyNotificationsSchema, "query"), listNotifications);

// ─────────────────────────────────────────────
// Mark them all as read
// ─────────────────────────────────────────────
router.post("/read-all", markAllNotificationsRead);

// ─────────────────────────────────────────────
// Mark one as read
// ─────────────────────────────────────────────
router.post(
  "/:notificationId/read",
  validate(notificationParamsSchema, "params"),
  markNotificationRead,
);

export default router;
