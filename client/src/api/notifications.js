import { api } from "@/lib/api";

// Every call to the /notifications endpoints lives here [AC-NOTIF-07].
// Any logged-in role uses them.

// My notifications, newest first, 20 a page.
// Returns { notifications, meta }; meta.unreadCount is the number on the bell.
export const getNotificationsRequest = async (page) => {
  const result = await api.get("/notifications?page=" + page);
  return { notifications: result.data, meta: result.meta };
};

// Just the unread count (asks for the smallest page possible)
export const getUnreadCountRequest = async () => {
  const result = await api.get("/notifications?pageSize=1");
  return result.meta.unreadCount;
};

// Returns { notification, unreadCount }
export const markNotificationReadRequest = async (notificationId) => {
  const result = await api.post("/notifications/" + notificationId + "/read");
  return result.data;
};

// Returns { unreadCount: 0 }
export const markAllNotificationsReadRequest = async () => {
  const result = await api.post("/notifications/read-all");
  return result.data;
};
