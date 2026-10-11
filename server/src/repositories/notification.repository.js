import { Notification } from "../models/index.js";

export const createNotification = (data) => {
  return Notification.create(data);
};

export const findMyNotifications = ({ userId, limit, offset }) => {
  return Notification.findAndCountAll({
    where: { userId },
    order: [
      ["createdAt", "DESC"],
      ["id", "DESC"],
    ],
    limit,
    offset,
  });
};

export const countUnread = (userId) => {
  return Notification.count({ where: { userId, readAt: null } });
};

export const findMyNotification = (notificationId, userId) => {
  return Notification.findOne({ where: { id: notificationId, userId } });
};

export const markAllRead = (userId, readAt) => {
  return Notification.update({ readAt }, { where: { userId, readAt: null } });
};
