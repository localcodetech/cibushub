import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { Notification } from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { createTestUser } from "../helpers/users.js";
import { notifyInApp } from "../../src/services/notifications/inApp.service.js";

vi.mock("../../src/sockets/emitToUser.js", () => ({ emitToUser: vi.fn() }));
const { emitToUser } = await import("../../src/sockets/emitToUser.js");

let ama;
let kofi;

const as = (user) => ({
  get: (path) =>
    request(app)
      .get(path)
      .set("Cookie", `access_token=${signAccessToken(user)}`),
  post: (path) =>
    request(app)
      .post(path)
      .set("Cookie", `access_token=${signAccessToken(user)}`),
});

const tellAma = (number, extra = {}) =>
  notifyInApp({
    userId: ama.id,
    type: "order.accepted",
    title: "Order accepted",
    body: `Order CH-${number} was accepted.`,
    link: `/customer/orders/${number}`,
    ...extra,
  });

beforeEach(async () => {
  vi.clearAllMocks();
  ama = await createTestUser({ email: "ama@example.com", phone: "+233241234567" });
  kofi = await createTestUser({ email: "kofi@example.com", phone: "+233551112222" });
});

describe("In-app notification centre [AC-NOTIF-07]", () => {
  it("saves a notification and pushes it live with the new unread count", async () => {
    await tellAma(1);
    await tellAma(2);

    expect(emitToUser).toHaveBeenCalledTimes(2);
    expect(emitToUser).toHaveBeenLastCalledWith(
      ama.id,
      "notification:new",
      expect.objectContaining({
        notification: expect.objectContaining({ title: "Order accepted", readAt: null }),
        unreadCount: 2,
      }),
    );
    // The server-only dedupe key never leaves the server
    expect(emitToUser.mock.calls[0][2].notification).not.toHaveProperty("dedupeKey");
  });

  it("shows one event once, however often it is triggered [AC-NOTIF-04]", async () => {
    const first = await tellAma(1, { key: "order:1:status:ACCEPTED:in-app" });
    const again = await tellAma(1, { key: "order:1:status:ACCEPTED:in-app" });

    expect(first.notificationId).toBeTruthy();
    expect(again).toEqual({ duplicate: true });
    expect(await Notification.count()).toBe(1);
  });

  it("lists only my notifications, newest first, with the unread count", async () => {
    await tellAma(1);
    await tellAma(2);
    await notifyInApp({ userId: kofi.id, type: "order.accepted", title: "Hi Kofi", body: "Yours" });

    const response = await as(ama).get("/api/v1/notifications");

    expect(response.status).toBe(200);
    expect(response.body.data.map((item) => item.body)).toEqual([
      "Order CH-2 was accepted.",
      "Order CH-1 was accepted.",
    ]);
    expect(response.body.data[0]).not.toHaveProperty("dedupeKey");
    expect(response.body.meta).toMatchObject({ totalItems: 2, unreadCount: 2 });
  });

  it("marks one as read, tells my other screens, and is fine reading it twice", async () => {
    const { notificationId } = await tellAma(1);
    await tellAma(2);

    const read = await as(ama).post(`/api/v1/notifications/${notificationId}/read`);
    const firstReadAt = (await Notification.findByPk(notificationId)).readAt;
    const again = await as(ama).post(`/api/v1/notifications/${notificationId}/read`);

    expect(read.status).toBe(200);
    expect(read.body.data.notification.readAt).toBeTruthy();
    expect(read.body.data.unreadCount).toBe(1);
    expect(again.status).toBe(200);
    expect((await Notification.findByPk(notificationId)).readAt).toEqual(firstReadAt);
    expect(emitToUser).toHaveBeenLastCalledWith(ama.id, "notification:unread", {
      unreadCount: 1,
    });
  });

  it("marks all as read", async () => {
    await tellAma(1);
    await tellAma(2);

    const response = await as(ama).post("/api/v1/notifications/read-all");
    const list = await as(ama).get("/api/v1/notifications");

    expect(response.body.data).toEqual({ unreadCount: 0 });
    expect(list.body.meta.unreadCount).toBe(0);
    expect(list.body.data.every((item) => item.readAt)).toBe(true);
  });

  it("someone else's notification is not found, and the list needs a login", async () => {
    const { notificationId } = await tellAma(1);

    const stranger = await as(kofi).post(`/api/v1/notifications/${notificationId}/read`);
    const guest = await request(app).get("/api/v1/notifications");

    expect(stranger.status).toBe(404);
    expect((await Notification.findByPk(notificationId)).readAt).toBeNull();
    expect(guest.status).toBe(401);
  });

  it("works for a rider still waiting for approval", async () => {
    const pending = await createTestUser({
      role: "RIDER",
      status: "PENDING_APPROVAL",
      email: "yaw@example.com",
      phone: "+233241110000",
    });

    const response = await as(pending).get("/api/v1/notifications");

    expect(response.status).toBe(200);
  });
});
