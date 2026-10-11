import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { NotificationLog } from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { notify, processNotification } from "../../src/services/notifications/notify.service.js";
import { createTestUser } from "../helpers/users.js";
import { emailFailures, sentEmails } from "../helpers/fakeEmail.js";
import { sentSms } from "../helpers/fakeSms.js";
import { scheduledJobs } from "../helpers/fakeJobs.js";

vi.mock("../../src/sockets/emitAdminAlert.js", () => ({ emitAdminAlert: vi.fn() }));
const { emitAdminAlert } = await import("../../src/sockets/emitAdminAlert.js");

const receiptEmail = (key = "order:1:receipt:email") =>
  notify({
    channel: "EMAIL",
    to: "ama@example.com",
    template: "order.receipt",
    key,
    subject: "Your receipt",
    text: "Thank you for your order",
  });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Sending through the queue [AC-NOTIF-02, AC-NOTIF-08]", () => {
  it("logs the message, queues it, and records it as sent", async () => {
    const { logId } = await receiptEmail();

    expect(scheduledJobs).toContainEqual({ name: "sendNotification", logId });
    expect(sentEmails).toHaveLength(1);
    // The provider gets an idempotency key: a retry after a timeout can't send twice
    expect(sentEmails[0].idempotencyKey).toBe(`notification-${logId}`);

    const log = await NotificationLog.findByPk(logId);
    expect(log).toMatchObject({
      channel: "EMAIL",
      template: "order.receipt",
      status: "SENT",
      attempts: 1,
      recipientMasked: "am***@example.com",
    });
    expect(log.sentAt).not.toBeNull();
    // The text itself is never stored
    expect(JSON.stringify(log.toJSON())).not.toContain("Thank you for your order");
  });

  it("sends SMS the same way", async () => {
    await notify({ channel: "SMS", to: "+233241234567", template: "test.sms", text: "Hello" });

    expect(sentSms).toEqual([{ phone: "+233241234567", message: "Hello" }]);
    expect(await NotificationLog.count({ where: { channel: "SMS", status: "SENT" } })).toBe(1);
  });
});

describe("No duplicates [AC-NOTIF-04]", () => {
  it("the same event key sends only once", async () => {
    await receiptEmail("order:7:receipt:email");
    const second = await receiptEmail("order:7:receipt:email");

    expect(second).toEqual({ duplicate: true });
    expect(sentEmails).toHaveLength(1);
    expect(await NotificationLog.count()).toBe(1);
  });

  it("messages without a key (e.g. one-time codes) are never blocked", async () => {
    await receiptEmail(null);
    await receiptEmail(null);

    expect(sentEmails).toHaveLength(2);
  });
});

describe("Retries [AC-NOTIF-03]", () => {
  it("a failed try is recorded and tried again; the last failure alerts admins", async () => {
    emailFailures.push({ ok: false, error: "UNREACHABLE" });
    const { logId } = await receiptEmail();

    let log = await NotificationLog.findByPk(logId);
    expect(log).toMatchObject({ status: "QUEUED", attempts: 1, lastError: "UNREACHABLE" });

    // The queue's 2nd try works
    const job = (attemptsMade) => ({
      data: {
        logId,
        payload: { channel: "EMAIL", to: "ama@example.com", subject: "Hi", text: "Hi" },
      },
      attemptsMade,
      opts: { attempts: 3 },
    });
    emailFailures.push({ ok: false, error: "UNREACHABLE" });
    await expect(processNotification(job(1))).rejects.toThrow("trying again");

    // The 3rd and last try fails too: FAILED, and admins are told
    emailFailures.push({ ok: false, error: "UNREACHABLE" });
    const result = await processNotification(job(2));

    expect(result).toMatchObject({ failed: true });
    log = await NotificationLog.findByPk(logId);
    expect(log).toMatchObject({ status: "FAILED", attempts: 3 });
    expect(emitAdminAlert).toHaveBeenCalledWith(
      "NOTIFICATION_FAILED",
      expect.objectContaining({ logId, template: "order.receipt" }),
    );
  });

  it("a refusal that won't change (e.g. a bad address) fails at once, without retries", async () => {
    emailFailures.push({ ok: false, error: "validation_error" });

    const { logId } = await receiptEmail();

    const log = await NotificationLog.findByPk(logId);
    expect(log).toMatchObject({ status: "FAILED", attempts: 1, lastError: "validation_error" });
  });

  it("an already-sent message is not sent again by a late retry", async () => {
    const { logId } = await receiptEmail();

    const result = await processNotification({
      data: { logId, payload: { channel: "EMAIL", to: "ama@example.com", text: "x" } },
      attemptsMade: 1,
      opts: { attempts: 3 },
    });

    expect(result).toEqual({ skipped: true });
    expect(sentEmails).toHaveLength(1);
  });
});

describe("Admins see what was sent [AC-NOTIF-03, AC-NOTIF-08]", () => {
  it("lists the failed ones, masked; only for admins", async () => {
    await receiptEmail("order:1:receipt:email");
    emailFailures.push({ ok: false, error: "validation_error" });
    await receiptEmail("order:2:receipt:email");
    const admin = await createTestUser({
      role: "ADMIN",
      email: "admin@example.com",
      phone: "+233200000001",
    });
    const customer = await createTestUser({ email: "kofi@example.com", phone: "+233201234567" });

    const response = await request(app)
      .get("/api/v1/admin/notifications?status=FAILED")
      .set("Cookie", `access_token=${signAccessToken(admin)}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      status: "FAILED",
      dedupeKey: "order:2:receipt:email",
      recipientMasked: "am***@example.com",
    });
    expect(response.body.meta.totalItems).toBe(1);

    const forbidden = await request(app)
      .get("/api/v1/admin/notifications")
      .set("Cookie", `access_token=${signAccessToken(customer)}`);
    expect(forbidden.status).toBe(403);
  });
});
