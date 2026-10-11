import { listMyNotificationsSchema } from "../../validators/notification/notification.validator.js";
import { errorResponse, listResponse, queryParameters, successResponse } from "../helpers.js";

const exampleNotification = {
  id: 42,
  userId: "0f1e2d3c-4b5a-4968-8776-655443322110",
  type: "order.accepted",
  title: "Order accepted",
  body: "Auntie Esi's Kitchen accepted order CH-261011-123456. Ready around 12:25.",
  link: "/customer/orders/9a8b7c6d-5e4f-4321-8765-0fedcba98765",
  readAt: null,
  createdAt: "2026-10-11T12:00:00.000Z",
  updatedAt: "2026-10-11T12:00:00.000Z",
};

const live =
  'Live updates on the socket: "notification:new" { notification, unreadCount } when one arrives, and "notification:unread" { unreadCount } when they are read on another screen.';

export const notificationPaths = {
  "/api/v1/notifications": {
    get: {
      tags: ["Notifications"],
      summary: "My in-app notifications, newest first, with the unread count",
      description: `Any signed-in role. meta.unreadCount is the number on the bell. ${live}`,
      security: [{ cookieAuth: [] }],
      parameters: queryParameters(listMyNotificationsSchema),
      responses: {
        200: listResponse("My notifications", exampleNotification, {
          page: 1,
          pageSize: 20,
          totalItems: 1,
          totalPages: 1,
          unreadCount: 1,
        }),
      },
    },
  },
  "/api/v1/notifications/read-all": {
    post: {
      tags: ["Notifications"],
      summary: "Mark all my notifications as read",
      security: [{ cookieAuth: [] }],
      responses: { 200: successResponse("All read", { unreadCount: 0 }) },
    },
  },
  "/api/v1/notifications/{notificationId}/read": {
    post: {
      tags: ["Notifications"],
      summary: "Mark one of my notifications as read",
      description: "Reading one twice is fine. Someone else's notification answers 404.",
      security: [{ cookieAuth: [] }],
      parameters: [
        {
          name: "notificationId",
          in: "path",
          required: true,
          schema: { type: "integer" },
        },
      ],
      responses: {
        200: successResponse("Read", {
          notification: { ...exampleNotification, readAt: "2026-10-11T12:05:00.000Z" },
          unreadCount: 0,
        }),
        404: errorResponse(
          "Not mine, or no such notification",
          "NOT_FOUND",
          "Notification not found",
        ),
      },
    },
  },
};
