import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import env from "../../src/config/env/env.js";
import { User } from "../../src/models/index.js";
import { createTestUser } from "../helpers/users.js";
import { sentEmails } from "../helpers/fakeEmail.js";
import { notify } from "../../src/services/notifications/notify.service.js";

// A made-up signing secret, in Resend's format
const SECRET = "whsec_" + Buffer.from("test-signing-secret").toString("base64");

let savedSecret;
let ama;

// Signs a body the way Resend (Svix) does
const signedHeaders = (rawBody, { secret = SECRET, timestamp } = {}) => {
  const id = "msg_test_1";
  const sentAt = String(timestamp ?? Math.floor(Date.now() / 1000));
  const key = Buffer.from(secret.replace("whsec_", ""), "base64");
  const signature = createHmac("sha256", key).update(`${id}.${sentAt}.${rawBody}`).digest("base64");
  return { "svix-id": id, "svix-timestamp": sentAt, "svix-signature": `v1,${signature}` };
};

const bounced = (to, type = "Permanent") => ({
  type: "email.bounced",
  created_at: "2026-10-11T12:00:00.000Z",
  data: {
    email_id: "4ef9a417-02e9-4d39-ad75-9611e0fcc33c",
    to: [to],
    subject: "Your CibusHub receipt",
    bounce: { type, subType: "General", message: "Mailbox does not exist" },
  },
});

const sendWebhook = (event, options) => {
  const rawBody = JSON.stringify(event);
  return request(app)
    .post("/api/v1/webhooks/resend")
    .set("Content-Type", "application/json")
    .set(signedHeaders(rawBody, options))
    .send(rawBody);
};

beforeEach(async () => {
  savedSecret = env.RESEND_WEBHOOK_SECRET;
  env.RESEND_WEBHOOK_SECRET = SECRET;
  ama = await createTestUser({ email: "ama@example.com", emailVerifiedAt: new Date() });
});

afterEach(() => {
  env.RESEND_WEBHOOK_SECRET = savedSecret;
});

describe("Bounced emails [AC-NOTIF-08, AC-AUTH-01]", () => {
  it("marks the address as bouncing and no longer confirmed", async () => {
    const response = await sendWebhook(bounced("ama@example.com"));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ received: true, outcome: "BOUNCE_RECORDED" });
    const after = await User.findByPk(ama.id);
    expect(after.emailBouncedAt).not.toBeNull();
    expect(after.emailVerifiedAt).toBeNull();
  });

  it("stops ordinary emails to it, but still sends codes", async () => {
    await sendWebhook(bounced("ama@example.com"));

    const receipt = await notify({
      channel: "EMAIL",
      to: "ama@example.com",
      template: "order.receipt",
      subject: "Your receipt",
      text: "Thanks",
    });
    await notify({
      channel: "EMAIL",
      to: "ama@example.com",
      template: "otp.verifyEmail",
      subject: "482913 is your CibusHub code",
      text: "Code",
    });

    expect(receipt).toEqual({ skipped: true, reason: "ADDRESS_BOUNCED" });
    expect(sentEmails.map((email) => email.subject)).toEqual(["482913 is your CibusHub code"]);
  });

  it("a soft bounce (e.g. a full mailbox) changes nothing", async () => {
    const response = await sendWebhook(bounced("ama@example.com", "Transient"));

    expect(response.body.data.outcome).toBe("IGNORED");
    expect((await User.findByPk(ama.id)).emailBouncedAt).toBeNull();
  });

  it("other events are read and ignored", async () => {
    const response = await sendWebhook({
      type: "email.delivered",
      data: { to: ["ama@example.com"] },
    });

    expect(response.status).toBe(200);
    expect(response.body.data.outcome).toBe("IGNORED");
  });

  it("refuses a wrong signature, an old message, or no secret set", async () => {
    const wrongSecret = await sendWebhook(bounced("ama@example.com"), {
      secret: "whsec_" + Buffer.from("someone-else").toString("base64"),
    });
    const tenMinutesAgo = await sendWebhook(bounced("ama@example.com"), {
      timestamp: Math.floor(Date.now() / 1000) - 10 * 60,
    });
    env.RESEND_WEBHOOK_SECRET = "";
    const noSecret = await sendWebhook(bounced("ama@example.com"));

    expect([wrongSecret.status, tenMinutesAgo.status, noSecret.status]).toEqual([401, 401, 401]);
    expect(wrongSecret.body.error.code).toBe("INVALID_SIGNATURE");
    expect((await User.findByPk(ama.id)).emailBouncedAt).toBeNull();
  });

  it("confirming the email again with a code clears the mark", async () => {
    await sendWebhook(bounced("ama@example.com"));
    const bouncedAma = await User.findByPk(ama.id);
    const { verifyEmail, sendEmailVerificationCode } =
      await import("../../src/services/auth/registration/verifyEmail.service.js");
    const { lastCodeEmailedTo } = await import("../helpers/fakeEmail.js");

    await sendEmailVerificationCode(bouncedAma.id);
    await verifyEmail(bouncedAma.id, lastCodeEmailedTo("ama@example.com"));

    const after = await User.findByPk(ama.id);
    expect(after.emailBouncedAt).toBeNull();
    expect(after.emailVerifiedAt).not.toBeNull();
  });
});
