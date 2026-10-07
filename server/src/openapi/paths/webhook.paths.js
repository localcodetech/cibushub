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
};
