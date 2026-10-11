import { errorResponse, successResponse } from "../helpers.js";

export const webhookPaths = {
  "/api/v1/webhooks/paystack": {
    post: {
      tags: ["Webhooks"],
      summary: "Paystack payment events (called by Paystack, not by the app)",
      description: [
        "Paystack signs the raw body with HMAC-SHA512 in the x-paystack-signature header; a wrong or missing signature gets 401.",
        "For charge.success, the server asks Paystack to verify the transaction and checks the exact amount and GHS before marking the order PAID.",
        "Repeat deliveries get 200 and change nothing. If Paystack cannot be reached, the answer is 502 so Paystack retries later.",
        "outcome is one of: ORDER_PAID, ALREADY_PROCESSED, AMOUNT_MISMATCH, NOT_PAID, PAID_AFTER_CLOSE, UNKNOWN_REFERENCE, IGNORED.",
      ].join(" "),
      parameters: [
        {
          name: "x-paystack-signature",
          in: "header",
          required: true,
          schema: { type: "string" },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            example: {
              event: "charge.success",
              data: { reference: "CH-261009-482193-9F3A1C", amount: 7072, currency: "GHS" },
            },
          },
        },
      },
      responses: {
        200: successResponse("Event received", { received: true, outcome: "ORDER_PAID" }),
        401: errorResponse("Bad signature", "INVALID_SIGNATURE", "Webhook signature is not valid"),
        502: errorResponse(
          "Paystack could not be reached to verify",
          "PAYMENT_PROVIDER_ERROR",
          "Payment service is not responding. Please try again",
        ),
      },
    },
  },
  "/api/v1/webhooks/resend": {
    post: {
      tags: ["Webhooks"],
      summary: "Resend email events (called by Resend, not by the app)",
      description: [
        "Resend signs the raw body the Svix way (svix-id, svix-timestamp, svix-signature headers, HMAC-SHA256 with RESEND_WEBHOOK_SECRET); a wrong signature, a message older than 5 minutes or no secret set gets 401.",
        "email.bounced (not Transient) marks the account's email as bouncing and unconfirmed: ordinary emails to it stop (codes still go) until it is confirmed again or changed.",
        "outcome is one of: BOUNCE_RECORDED, IGNORED.",
      ].join(" "),
      parameters: ["svix-id", "svix-timestamp", "svix-signature"].map((name) => ({
        name,
        in: "header",
        required: true,
        schema: { type: "string" },
      })),
      requestBody: {
        required: true,
        content: {
          "application/json": {
            example: {
              type: "email.bounced",
              created_at: "2026-10-11T12:00:00.000Z",
              data: {
                email_id: "4ef9a417-02e9-4d39-ad75-9611e0fcc33c",
                to: ["ama@example.com"],
                bounce: { type: "Permanent", message: "Mailbox does not exist" },
              },
            },
          },
        },
      },
      responses: {
        200: successResponse("Event received", { received: true, outcome: "BOUNCE_RECORDED" }),
        401: errorResponse("Bad signature", "INVALID_SIGNATURE", "Webhook signature is not valid"),
      },
    },
  },
};
