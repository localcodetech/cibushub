import { afterEach, describe, expect, it, vi } from "vitest";
import env from "../../src/config/env/env.js";
import {
  initializeTransaction,
  verifyTransaction,
} from "../../src/services/payment/paystack.client.js";

const answer = (status, body) => ({ ok: status < 400, status, json: async () => body });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Paystack client [AC-PAY-01, AC-PAY-03]", () => {
  it("sends the secret key, GHS amount in pesewas and both channels", async () => {
    const fakeFetch = vi.fn(async () =>
      answer(200, { status: true, data: { authorization_url: "https://x", access_code: "abc" } }),
    );
    vi.stubGlobal("fetch", fakeFetch);

    const result = await initializeTransaction({
      email: "ama@example.com",
      amountPesewas: 7072,
      reference: "CH-1",
      callbackUrl: "http://localhost:5173/orders/1/payment",
      metadata: {},
    });

    const [url, options] = fakeFetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(url).toBe(`${env.PAYSTACK_BASE_URL}/transaction/initialize`);
    expect(options.headers.Authorization).toBe(`Bearer ${env.PAYSTACK_SECRET_KEY}`);
    expect(body).toMatchObject({
      amount: 7072,
      currency: "GHS",
      channels: ["card", "mobile_money"],
    });
    expect(result).toEqual({ authorizationUrl: "https://x", accessCode: "abc" });
  });

  it("turns a Paystack refusal into a clear 502", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => answer(400, { status: false, message: "Invalid key" })),
    );

    await expect(verifyTransaction("CH-1")).rejects.toMatchObject({
      statusCode: 502,
      code: "PAYMENT_PROVIDER_ERROR",
    });
  });

  it("reads a verification answer", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        answer(200, {
          status: true,
          data: {
            status: "success",
            amount: 7072,
            currency: "GHS",
            reference: "CH-1",
            channel: "mobile_money",
            id: 123,
            gateway_response: "Approved",
            paid_at: "2026-10-09T12:05:00.000Z",
          },
        }),
      ),
    );

    const result = await verifyTransaction("CH-1");

    expect(result).toMatchObject({
      status: "success",
      amountPesewas: 7072,
      channel: "mobile_money",
      providerTransactionId: "123",
    });
  });
});
