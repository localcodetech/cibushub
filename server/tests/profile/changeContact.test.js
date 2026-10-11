import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { User } from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { createTestUser } from "../helpers/users.js";
import { lastCodeSentTo, sentSms } from "../helpers/fakeSms.js";

// Pretend email: keep every email in a list instead of sending it
const sentEmails = vi.hoisted(() => []);

vi.mock("../../src/services/notifications/email.service.js", () => ({
  sendEmail: async (to, subject, text) => {
    sentEmails.push({ to, subject, text });
  },
}));

const lastCodeEmailedTo = (email) => {
  const emails = sentEmails.filter((sent) => sent.to === email);
  // The branded code email starts its subject with the code: "482913 is your CibusHub code"
  const match = emails.at(-1)?.subject.match(/^(\d{6}) is your CibusHub code$/);
  return match ? match[1] : null;
};

const oldPhone = "+233241234567";
const newPhone = "+233209998888";

let customer;

beforeEach(async () => {
  sentEmails.length = 0;
  customer = await createTestUser({ email: "ama@example.com", phone: oldPhone });
});

const postAs = (user, path, body) => {
  return request(app)
    .post(path)
    .set("Cookie", `access_token=${signAccessToken(user)}`)
    .send(body);
};

describe("Changing my phone number [AC-CUST-02]", () => {
  it("texts a code to the new number and changes nothing yet", async () => {
    const response = await postAs(customer, "/api/v1/profile/phone", { phone: "020 999 8888" });

    expect(response.status).toBe(200);
    expect(response.body.data.phone).toBe(newPhone);
    expect(lastCodeSentTo(newPhone)).toMatch(/^\d{6}$/);

    const saved = await User.findByPk(customer.id);
    expect(saved.phone).toBe(oldPhone);
  });

  it("saves the new number only after the right code, and warns the old number", async () => {
    await postAs(customer, "/api/v1/profile/phone", { phone: newPhone });
    const code = lastCodeSentTo(newPhone);

    const response = await postAs(customer, "/api/v1/profile/phone/confirm", { code });

    expect(response.status).toBe(200);
    expect(response.body.data.phone).toBe(newPhone);
    expect(sentSms.at(-1).phone).toBe(oldPhone);
    expect(sentSms.at(-1).message).toContain("changed");
  });

  it("keeps the old number when the code is wrong", async () => {
    await postAs(customer, "/api/v1/profile/phone", { phone: newPhone });
    const wrongCode = lastCodeSentTo(newPhone) === "000000" ? "111111" : "000000";

    const response = await postAs(customer, "/api/v1/profile/phone/confirm", { code: wrongCode });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("OTP_INVALID");
    expect((await User.findByPk(customer.id)).phone).toBe(oldPhone);
  });

  it("refuses to confirm when no change was requested", async () => {
    const response = await postAs(customer, "/api/v1/profile/phone/confirm", { code: "123456" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("OTP_EXPIRED");
  });

  it("refuses a number another account already uses", async () => {
    await createTestUser({ email: "kofi@example.com", phone: newPhone });

    const response = await postAs(customer, "/api/v1/profile/phone", { phone: newPhone });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("ACCOUNT_EXISTS");
    expect(lastCodeSentTo(newPhone)).toBeNull();
  });

  it("refuses my current number", async () => {
    const response = await postAs(customer, "/api/v1/profile/phone", { phone: oldPhone });

    expect(response.status).toBe(400);
  });
});

describe("Changing my email [AC-CUST-02]", () => {
  it("emails a code to the new address and changes nothing yet", async () => {
    const response = await postAs(customer, "/api/v1/profile/email", {
      email: "Ama.New@Example.com",
    });

    expect(response.status).toBe(200);
    expect(response.body.data.email).toBe("ama.new@example.com");
    expect(lastCodeEmailedTo("ama.new@example.com")).toMatch(/^\d{6}$/);
    expect((await User.findByPk(customer.id)).email).toBe("ama@example.com");
  });

  it("saves the new email only after the right code, and warns the old email", async () => {
    await postAs(customer, "/api/v1/profile/email", { email: "ama.new@example.com" });
    const code = lastCodeEmailedTo("ama.new@example.com");

    const response = await postAs(customer, "/api/v1/profile/email/confirm", { code });

    expect(response.status).toBe(200);
    expect(response.body.data.email).toBe("ama.new@example.com");
    expect(response.body.data.emailVerifiedAt).not.toBeNull();
    expect(sentEmails.at(-1).to).toBe("ama@example.com");
  });

  it("refuses an email another account already uses", async () => {
    await createTestUser({ email: "kofi@example.com", phone: newPhone });

    const response = await postAs(customer, "/api/v1/profile/email", {
      email: "kofi@example.com",
    });

    expect(response.status).toBe(409);
  });
});
