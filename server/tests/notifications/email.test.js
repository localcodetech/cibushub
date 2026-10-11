import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import env from "../../src/config/env/env.js";

// setup.js swaps the email service for an inbox; here we test the real one, with Resend faked
const { sendEmail, maskEmail } = await vi.importActual(
  "../../src/services/notifications/email.service.js",
);

const resendAnswers = (status, body) =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );

let savedKey;

beforeEach(() => {
  savedKey = env.RESEND_API_KEY;
  env.RESEND_API_KEY = "re_test_key";
});

afterEach(() => {
  env.RESEND_API_KEY = savedKey;
  vi.restoreAllMocks();
});

describe("Sending email through Resend [AC-NOTIF-05, AC-NOTIF-08]", () => {
  it("sends text and HTML from our address, with the idempotency key", async () => {
    const fetchSpy = resendAnswers(200, { id: "email_123" });

    const result = await sendEmail("ama@example.com", "Your receipt", "Plain text", {
      html: "<p>Branded</p>",
      idempotencyKey: "order:1:receipt:email",
    });

    expect(result).toEqual({ ok: true, id: "email_123" });
    const [url, request] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(request.headers).toMatchObject({
      Authorization: "Bearer re_test_key",
      "Idempotency-Key": "order:1:receipt:email",
    });
    expect(JSON.parse(request.body)).toMatchObject({
      from: env.EMAIL_FROM,
      to: ["ama@example.com"],
      subject: "Your receipt",
      text: "Plain text",
      html: "<p>Branded</p>",
    });
  });

  it("sends attached files, e.g. the receipt PDF [AC-PAY-17]", async () => {
    const fetchSpy = resendAnswers(200, { id: "email_124" });
    const attachment = { filename: "CibusHub-receipt-CH-1.pdf", content: "JVBERi0=" };

    await sendEmail("ama@example.com", "Your receipt", "Plain text", {
      attachments: [attachment],
    });

    expect(JSON.parse(fetchSpy.mock.calls[0][1].body).attachments).toEqual([attachment]);
  });

  it("answers ok: false (never throws) when Resend refuses or can't be reached", async () => {
    resendAnswers(422, { statusCode: 422, name: "validation_error", message: "Invalid `to`" });
    expect(await sendEmail("ama@example.com", "Hi", "Hello")).toEqual({
      ok: false,
      error: "validation_error",
    });

    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));
    expect(await sendEmail("ama@example.com", "Hi", "Hello")).toEqual({
      ok: false,
      error: "UNREACHABLE",
    });
  });

  it("without a key, sends nothing", async () => {
    env.RESEND_API_KEY = undefined;
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const result = await sendEmail("ama@example.com", "Hi", "Hello");

    expect(result).toEqual({ ok: false, error: "NOT_CONFIGURED" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("logs addresses masked", () => {
    expect(maskEmail("kofi.mensah@gmail.com")).toBe("ko***@gmail.com");
  });
});
