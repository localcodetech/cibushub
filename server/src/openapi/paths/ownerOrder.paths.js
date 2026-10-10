import {
  acceptOrderSchema,
  ownerBoardSchema,
  ownerHistorySchema,
  ownerSummarySchema,
  rejectOrderSchema,
} from "../../validators/order/ownerOrders.validator.js";
import {
  errorResponse,
  jsonBody,
  listResponse,
  pathParameter,
  queryParameters,
  successResponse,
} from "../helpers.js";

const tags = ["Owner: Orders"];
const loggedIn = [{ cookieAuth: [] }];
const orderId = pathParameter("orderId", "An order of one of your restaurants");

// What the kitchen sees: never the customer's phone or address [AC-RORD-02]
const exampleKitchenOrder = {
  id: "6a7b8c9d-0e1f-4a2b-8c3d-4e5f6a7b8c9d",
  orderNumber: "CH-261010-482193",
  status: "PAID",
  restaurant: {
    id: "9b2f4c1e-3a7d-4e8f-9c21-5d6e7f8a9b0c",
    name: "Auntie Akos Kitchen",
    prepTimeMinutes: 20,
  },
  customerFirstName: "Ama",
  placedAt: "2026-10-10T12:00:00.000Z",
  paidAt: "2026-10-10T12:00:40.000Z",
  estimatedReadyAt: null,
  restaurantNote: "Less pepper",
  items: [
    {
      id: "1f2e3d4c-5b6a-4987-8a1b-2c3d4e5f6a7b",
      name: "Jollof with Protein",
      quantity: 2,
      options: [{ groupName: "Protein", name: "Chicken" }],
      lineTotalPesewas: 9000,
    },
  ],
  subtotalPesewas: 9000,
  restaurantEarningsPesewas: 8100,
  cancellationReason: null,
  ownerActions: ["ACCEPTED", "REJECTED"],
};

const notFound = errorResponse("Not one of your orders", "NOT_FOUND", "Order not found");
const wrongStep = errorResponse(
  "Not allowed from the order's current status",
  "INVALID_STATUS_TRANSITION",
  "Cannot change an order from PAID to READY_FOR_PICKUP",
);
const validationError = errorResponse("Invalid input", "VALIDATION_ERROR", "Invalid request data");

const moveOrder = (summary, description, status, body) => ({
  post: {
    tags,
    summary,
    description,
    security: loggedIn,
    parameters: [orderId],
    ...(body ? { requestBody: body } : {}),
    responses: {
      200: successResponse("The order now", { ...exampleKitchenOrder, status }),
      ...(body ? { 400: validationError } : {}),
      404: notFound,
      409: wrongStep,
    },
  },
});

export const ownerOrderPaths = {
  "/api/v1/owner/orders": {
    get: {
      tags,
      summary: "The board: every order still in my kitchen, oldest first",
      description:
        "Active owners only. Statuses PAID to PICKED_UP. Live changes arrive on the Socket.IO event order:updated in the restaurant's room.",
      security: loggedIn,
      parameters: queryParameters(ownerBoardSchema),
      responses: { 200: successResponse("Orders", [exampleKitchenOrder]) },
    },
  },
  "/api/v1/owner/orders/history": {
    get: {
      tags,
      summary: "Past orders by day range and status, newest first",
      description: "Days are read in Ghana time. Without from/to: today.",
      security: loggedIn,
      parameters: queryParameters(ownerHistorySchema),
      responses: {
        200: listResponse(
          "One page of orders",
          {
            id: exampleKitchenOrder.id,
            orderNumber: exampleKitchenOrder.orderNumber,
            status: "DELIVERED",
            restaurant: {
              id: exampleKitchenOrder.restaurant.id,
              name: exampleKitchenOrder.restaurant.name,
            },
            placedAt: exampleKitchenOrder.placedAt,
            subtotalPesewas: 9000,
            restaurantEarningsPesewas: 8100,
          },
          { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
        ),
        400: validationError,
      },
    },
  },
  "/api/v1/owner/orders/summary": {
    get: {
      tags,
      summary: "One day in numbers: orders per status, sales and earnings",
      description: "Rejected and cancelled orders are counted but add no sales or earnings.",
      security: loggedIn,
      parameters: queryParameters(ownerSummarySchema),
      responses: {
        200: successResponse("The day", {
          date: "2026-10-10",
          orderCount: 12,
          byStatus: { DELIVERED: 10, REJECTED: 1, PREPARING: 1 },
          salesPesewas: 98000,
          earningsPesewas: 88200,
        }),
      },
    },
  },
  "/api/v1/owner/orders/{orderId}": {
    get: {
      tags,
      summary: "One order, as the kitchen sees it",
      security: loggedIn,
      parameters: [orderId],
      responses: { 200: successResponse("The order", exampleKitchenOrder), 404: notFound },
    },
  },
  "/api/v1/owner/orders/{orderId}/accept": moveOrder(
    "Accept a paid order",
    "prepTimeMinutes (5 to 180) is optional; the restaurant's usual preparation time is used otherwise. Sets estimatedReadyAt.",
    "ACCEPTED",
    jsonBody(acceptOrderSchema, { prepTimeMinutes: 25 }),
  ),
  "/api/v1/owner/orders/{orderId}/reject": moveOrder(
    "Reject a paid order with a reason",
    "The customer sees the reason. A paid order is refunded in full in the same transaction.",
    "REJECTED",
    jsonBody(rejectOrderSchema, { reason: "Kitchen closing early" }),
  ),
  "/api/v1/owner/orders/{orderId}/preparing": moveOrder(
    "Start preparing an accepted order",
    "One tap. The customer sees it live.",
    "PREPARING",
  ),
  "/api/v1/owner/orders/{orderId}/ready": moveOrder(
    "Mark a preparing order ready for pickup",
    "One tap. Rider assignment follows in Step 11.",
    "READY_FOR_PICKUP",
  ),
};
