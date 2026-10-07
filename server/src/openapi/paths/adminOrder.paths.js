import { adminCancelOrderSchema } from "../../validators/order/adminCancelOrder.validator.js";
import { errorResponse, jsonBody, pathParameter, successResponse } from "../helpers.js";

export const adminOrderPaths = {
  "/api/v1/admin/orders/{orderId}/cancel": {
    post: {
      tags: ["Admin: Orders"],
      summary: "Cancel any unfinished order, with a full, partial or no refund",
      description: [
        "A reason of at least 10 characters is required.",
        "refund: FULL gives back everything not yet refunded; PARTIAL needs refundAmountPesewas; NONE gives nothing back.",
        "The cancel, the refund and the audit-log row are saved together: if the refund is not allowed, the order is NOT cancelled.",
      ].join(" "),
      security: [{ cookieAuth: [] }],
      parameters: [pathParameter("orderId", "Any order")],
      requestBody: jsonBody(adminCancelOrderSchema, {
        reason: "Restaurant ran out of gas",
        refund: "PARTIAL",
        refundAmountPesewas: 1500,
      }),
      responses: {
        200: successResponse("Cancelled", {
          id: "6a7b8c9d-0e1f-4a2b-8c3d-4e5f6a7b8c9d",
          orderNumber: "CH-261009-482193",
          status: "CANCELLED",
          paymentStatus: "PAID",
          cancellationReason: "Restaurant ran out of gas",
          refunds: [
            { amountPesewas: 1500, status: "PENDING", reason: "Restaurant ran out of gas" },
          ],
        }),
        400: errorResponse("Invalid input", "VALIDATION_ERROR", "Invalid request data"),
        403: errorResponse("Not an admin", "FORBIDDEN", "You do not have permission to do this"),
        404: errorResponse("No such order", "NOT_FOUND", "Order not found"),
        409: errorResponse(
          "Finished order, or refund not allowed",
          "REFUND_EXCEEDS_PAID",
          "At most GHS 10.00 can still be refunded for this order",
        ),
      },
    },
  },
};
