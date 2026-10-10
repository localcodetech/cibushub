import { adminCancelOrderSchema } from "../../validators/order/adminCancelOrder.validator.js";
import {
  assignRiderSchema,
  unassignRiderSchema,
} from "../../validators/order/manualAssignment.validator.js";
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
  "/api/v1/admin/orders/{orderId}/rider": {
    post: {
      tags: ["Admin: Orders"],
      summary: "Give the order to a chosen rider, or replace its rider",
      description:
        "Between acceptance and pickup. The rider must be approved, online and free. If the food is ready the order becomes RIDER_ASSIGNED (admin and reason in the status history); replacing a rider also records the move back to READY_FOR_PICKUP. Audit logged; both riders' apps are told live.",
      security: [{ cookieAuth: [] }],
      parameters: [pathParameter("orderId", "Any order")],
      requestBody: jsonBody(assignRiderSchema, {
        riderProfileId: "3c1d2e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f",
        reason: "Rider is waiting at the restaurant",
      }),
      responses: {
        200: successResponse("Assigned", {
          orderId: "0f1e2d3c-4b5a-4968-8776-655443322110",
          deliveryId: "6f5e4d3c-2b1a-4c9d-8e7f-6a5b4c3d2e1f",
          riderProfileId: "3c1d2e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f",
        }),
        409: errorResponse(
          "Not assignable (also RIDER_NOT_AVAILABLE, RIDER_BUSY, ALREADY_ASSIGNED, ORDER_NOT_ASSIGNABLE)",
          "DELIVERY_ALREADY_PICKED_UP",
          "The food has already been picked up; the rider can't be changed now",
        ),
      },
    },
  },
  "/api/v1/admin/orders/{orderId}/rider/unassign": {
    post: {
      tags: ["Admin: Orders"],
      summary: "Take the rider off the order",
      description:
        "Before pickup only. The delivery searches again (that rider is never asked again), and an order showing RIDER_ASSIGNED goes back to READY_FOR_PICKUP. Audit logged.",
      security: [{ cookieAuth: [] }],
      parameters: [pathParameter("orderId", "Any order")],
      requestBody: jsonBody(unassignRiderSchema, { reason: "Rider not answering calls" }),
      responses: {
        200: successResponse("Back in the search", {
          orderId: "0f1e2d3c-4b5a-4968-8776-655443322110",
          deliveryId: "6f5e4d3c-2b1a-4c9d-8e7f-6a5b4c3d2e1f",
        }),
        409: errorResponse(
          "No rider, or already picked up",
          "NO_RIDER_ASSIGNED",
          "No rider is assigned to this order",
        ),
      },
    },
  },
};
