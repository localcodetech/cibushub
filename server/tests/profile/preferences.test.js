import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { User } from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { createTestUser } from "../helpers/users.js";
import { sentEmails } from "../helpers/fakeEmail.js";
import { sentSms } from "../helpers/fakeSms.js";
import { notify } from "../../src/services/notifications/notify.service.js";

let ama;

const setPreferences = (user, body) =>
  request(app)
    .patch("/api/v1/profile/preferences")
    .set("Cookie", `access_token=${signAccessToken(user)}`)
    .send(body);

// An offer, as a future promo campaign would send it
const sendOffer = (channel, to) =>
  notify({
    channel,
    to,
    template: "marketing.promo",
    subject: "20% off this weekend",
    text: "20% off this weekend",
  });

beforeEach(async () => {
  ama = await createTestUser({ email: "ama@example.com", phone: "+233241234567" });
});

describe("Notification preferences [AC-NOTIF-09]", () => {
  it("starts with no to offers and news", async () => {
    expect((await User.findByPk(ama.id)).marketingOptIn).toBe(false);
  });

  it("says yes, and remembers when (proof of consent)", async () => {
    const response = await setPreferences(ama, { marketingOptIn: true });

    expect(response.status).toBe(200);
    expect(response.body.data.marketingOptIn).toBe(true);
    expect(response.body.data.marketingOptInChangedAt).toBeTruthy();
  });

  it("offers only reach people who said yes, by email and SMS", async () => {
    const skipped = await sendOffer("EMAIL", "ama@example.com");
    await sendOffer("SMS", "+233241234567");

    await setPreferences(ama, { marketingOptIn: true });
    await sendOffer("EMAIL", "ama@example.com");
    await sendOffer("SMS", "+233241234567");

    expect(skipped).toEqual({ skipped: true, reason: "NO_MARKETING_CONSENT" });
    expect(sentEmails).toHaveLength(1);
    expect(sentSms).toHaveLength(1);
  });

  it("saying no stops offers, but order messages always go", async () => {
    await setPreferences(ama, { marketingOptIn: true });
    await setPreferences(ama, { marketingOptIn: false });

    await sendOffer("EMAIL", "ama@example.com");
    await notify({
      channel: "EMAIL",
      to: "ama@example.com",
      template: "order.receipt",
      subject: "Your receipt",
      text: "Thanks",
    });

    expect(sentEmails.map((email) => email.subject)).toEqual(["Your receipt"]);
  });

  it("only takes a yes or no", async () => {
    const response = await setPreferences(ama, { marketingOptIn: "maybe", orderUpdates: false });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});
