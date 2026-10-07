import {
  cancelOrderSchema,
  listMyOrdersSchema,
} from "../../validators/order/myOrders.validator.js";
import {
  errorResponse,
  jsonBody,
  listResponse,
  pathParameter,
  queryParameters,
  successResponse,
} from "../helpers.js";

const exampleListedOrder = {
  id: "6a7b8c9d-0e1f-4a2b-8c3d-4e5f6a7b8c9d",
  orderNumber: "CH-261009-482193",
  status: "PENDING_PAYMENT",
  paymentStatus: "UNPAID",
  totalPesewas: 7072,
  createdAt: "2026-10-09T12:00:00.000Z",
  restaurant: {
    id: "9b2f4c1e-3a7d-4e8f-9c21-5d6e7f8a9b0c",
    name: "Auntie Akos Kitchen",
    logoUrl: null,
  },
};

const exampleOrderDetail = {
  ...exampleListedOrder,
  subtotalPesewas: 6000,
  deliveryFeePesewas: 1072,
  items: [
    {
      name: "Waakye",
      basePricePesewas: 3000,
      unitPricePesewas: 3000,
      quantity: 2,
      lineTotalPesewas: 6000,
      options: [],
    },
  ],
  timeline: [{ status: "PENDING_PAYMENT", at: "2026-10-09T12:00:00.000Z", reason: null }],
  customerActions: ["CANCELLED"],
};

const tags = ["Customer: Orders"];
const loggedIn = [{ cookieAuth: [] }];
const orderId = pathParameter("orderId", "One of your orders");
const notFound = errorResponse("Not yours, or does not exist", "NOT_FOUND", "Order not found");

export const customerOrderPaths = {
  "/api/v1/customer/orders/{orderId}": {
    get: {
      tags,
      summary: "One of my orders, with its timeline",
      description:
        "timeline lists every status reached, with times. customerActions lists what the customer may still do (e.g. CANCELLED before the restaurant accepts).",
      security: loggedIn,
      parameters: [orderId],
      responses: { 200: successResponse("The order", exampleOrderDetail), 404: notFound },
    },
  },

  "/api/v1/customer/orders/{orderId}/cancel": {
    post: {
      tags,
      summary: "Cancel my order before the restaurant accepts it",
      description:
        "A reason is required. Reserved stock is given back. After the restaurant accepts, contact support instead.",
      security: loggedIn,
      parameters: [orderId],
      requestBody: jsonBody(cancelOrderSchema, { reason: "Ordered by mistake" }),
      responses: {
        200: successResponse("Cancelled", {
          ...exampleOrderDetail,
          status: "CANCELLED",
          cancellationReason: "Ordered by mistake",
          customerActions: [],
        }),
        400: errorResponse("No reason", "VALIDATION_ERROR", "Invalid request data"),
        403: errorResponse(
          "Already accepted by the restaurant",
          "FORBIDDEN",
          "You do not have permission to do this",
        ),
        404: notFound,
        409: errorResponse(
          "Already finished",
          "INVALID_STATUS_TRANSITION",
          "An order that is CANCELLED cannot be changed to CANCELLED",
        ),
      },
    },
  },
};

// The list lives on the same URL as "place order", so it is merged in document.js
export const customerOrderListOperation = {
  tags,
  summary: "My orders, newest first",
  security: loggedIn,
  parameters: queryParameters(listMyOrdersSchema),
  responses: {
    200: listResponse("One page of my orders", exampleListedOrder, {
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    }),
  },
};
