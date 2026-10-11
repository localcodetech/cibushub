import {
  adminListPaymentsSchema,
  adminListRefundsSchema,
  retryRefundSchema,
} from "../../validators/admin/adminPayments.validator.js";
import {
  errorResponse,
  jsonBody,
  listResponse,
  pathParameter,
  queryParameters,
  successResponse,
} from "../helpers.js";

const tags = ["Admin: Payments"];
const loggedIn = [{ cookieAuth: [] }];
const page = { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 };

export const adminPaymentPaths = {
  "/api/v1/admin/payments": {
    get: {
      tags,
      summary: "Every payment attempt, newest first",
      description:
        "flagged=true: AMOUNT_MISMATCH, or PENDING for 30+ minutes. q: a payment reference or an order number [AC-ADM-06].",
      security: loggedIn,
      parameters: queryParameters(adminListPaymentsSchema),
      responses: {
        200: listResponse(
          "One page of payments",
          {
            id: "6a5b4c3d-2e1f-4a0b-9c8d-7e6f5a4b3c2d",
            reference: "CH-261011-123456-9F3A1C",
            amountPesewas: 7436,
            status: "PENDING",
            gatewayResponse: null,
            createdAt: "2026-10-11T12:00:00.000Z",
            order: {
              id: "0f1e2d3c-4b5a-4968-8776-655443322110",
              orderNumber: "CH-261011-123456",
              customer: { fullName: "Kofi Adjei" },
            },
          },
          page,
        ),
      },
    },
  },
  "/api/v1/admin/payments/{paymentId}/reverify": {
    post: {
      tags,
      summary: "Ask Paystack again about one payment",
      description:
        "Runs the same verification as the webhook (exact amount, GHS). outcome: ORDER_PAID, ALREADY_PROCESSED, AMOUNT_MISMATCH, NOT_PAID, STILL_PENDING, PAID_AFTER_CLOSE. Audited as PAYMENT_REVERIFIED.",
      security: loggedIn,
      parameters: [pathParameter("paymentId", "Any payment attempt")],
      responses: {
        200: successResponse("Paystack's answer, recorded", {
          outcome: "NOT_PAID",
          payment: { reference: "CH-261011-123456-9F3A1C", status: "ABANDONED" },
        }),
        404: errorResponse("No such payment", "NOT_FOUND", "Payment not found"),
      },
    },
  },
  "/api/v1/admin/refunds": {
    get: {
      tags,
      summary: "Every refund, newest first",
      security: loggedIn,
      parameters: queryParameters(adminListRefundsSchema),
      responses: {
        200: listResponse(
          "One page of refunds",
          {
            id: "1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e",
            amountPesewas: 7436,
            status: "FAILED",
            reason: "RESTAURANT_TIMEOUT",
            failureReason: "Paystack refund failed",
            order: { id: "0f1e2d3c-4b5a-4968-8776-655443322110", orderNumber: "CH-261011-123456" },
          },
          page,
        ),
      },
    },
  },
  "/api/v1/admin/refunds/{refundId}/retry": {
    post: {
      tags,
      summary: "Send a failed refund to Paystack again",
      description:
        "Back to PENDING without the old Paystack id; the refund job sends a new request. Reason required; audited as REFUND_RETRIED [AC-ADM-06, AC-ADM-08].",
      security: loggedIn,
      parameters: [pathParameter("refundId", "A failed refund")],
      requestBody: jsonBody(retryRefundSchema, {
        reason: "Customer's MoMo wallet is working again",
      }),
      responses: {
        200: successResponse("Queued again", { status: "PENDING" }),
        400: errorResponse("No reason", "VALIDATION_ERROR", "Invalid request data"),
        404: errorResponse("No such refund", "NOT_FOUND", "Refund not found"),
        409: errorResponse(
          "Not failed",
          "REFUND_NOT_FAILED",
          "Only a failed refund can be tried again",
        ),
      },
    },
  },
};
