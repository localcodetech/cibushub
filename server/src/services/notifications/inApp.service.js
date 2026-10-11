import logger from "../../config/logger.js";
import AppError from "../../utils/AppError.js";
import { emitToUser } from "../../sockets/emitToUser.js";
import { buildPageMeta, toLimitAndOffset } from "../../utils/pagination.js";
import {
  countUnread,
  createNotification,
  findMyNotification,
  findMyNotifications,
  markAllRead,
} from "../../repositories/notification.repository.js";
import { findActiveAdmins } from "../../repositories/user.repository.js";

// The in-app notification centre [AC-NOTIF-07]: saved in MySQL, pushed live with Socket.IO.
// Live events to the user's screens:
//   "notification:new"    { notification, unreadCount }  a new one arrived
//   "notification:unread" { unreadCount }                 read on another screen

// Saves one notification and pushes it to every screen the user has open.
//   type:  e.g. "order.accepted"
//   title, body: what the user reads
//   link:  where tapping it goes, e.g. "/customer/orders/<id>"
//   key:   the event, e.g. "order:<id>:status:ACCEPTED:in-app", or null (no check) [AC-NOTIF-04]
// Never throws: a notification must never break the order or payment that triggered it.
export const notifyInApp = async ({ userId, type, title, body, link = null, key = null }) => {
  try {
    const notification = await createNotification({
      userId,
      type,
      title,
      body,
      link,
      dedupeKey: key,
    });
    const unreadCount = await countUnread(userId);
    // As the list shows it: no server-only key, and unread
    const shown = notification.toJSON();
    delete shown.dedupeKey;
    emitToUser(userId, "notification:new", {
      notification: { ...shown, readAt: null },
      unreadCount,
    });
    return { notificationId: notification.id };
  } catch (error) {
    // Already shown for this event
    if (error.name === "SequelizeUniqueConstraintError") {
      return { duplicate: true };
    }
    logger.error({ err: error, userId, type }, "Could not save an in-app notification");
    return { failed: true };
  }
};

// My notifications, newest first, with the unread count for the bell
export const listMyNotifications = async (userId, query) => {
  const { limit, offset } = toLimitAndOffset(query);
  const [{ rows, count }, unreadCount] = await Promise.all([
    findMyNotifications({ userId, limit, offset }),
    countUnread(userId),
  ]);

  return { notifications: rows, meta: { ...buildPageMeta(query, count), unreadCount } };
};

// Tells my other open screens the new count, so their bells match
const syncUnread = async (userId) => {
  const unreadCount = await countUnread(userId);
  emitToUser(userId, "notification:unread", { unreadCount });
  return unreadCount;
};

// Reading one twice is fine; someone else's is "not found"
export const readNotification = async (notificationId, userId) => {
  const notification = await findMyNotification(notificationId, userId);
  if (!notification) {
    throw new AppError(404, "NOT_FOUND", "Notification not found");
  }
  if (!notification.readAt) {
    await notification.update({ readAt: new Date() });
  }
  const unreadCount = await syncUnread(userId);

  return { notification, unreadCount };
};

export const readAllNotifications = async (userId) => {
  await markAllRead(userId, new Date());
  const unreadCount = await syncUnread(userId);

  return { unreadCount };
};

// One in-app notification for every active admin, e.g. "No rider found" [AC-NOTIF-01].
//   key: the event, e.g. "delivery:<id>:no-rider"; each admin sees it once
// Never throws.
export const notifyAdminsInApp = async ({ type, key, title, body, link = "/admin" }) => {
  try {
    const admins = await findActiveAdmins();
    for (const admin of admins) {
      await notifyInApp({
        userId: admin.id,
        type,
        title,
        body,
        link,
        key: `${key}:admin:${admin.id}:in-app`,
      });
    }
  } catch (error) {
    logger.error({ err: error, type }, "Could not notify the admins in the app");
  }
};
