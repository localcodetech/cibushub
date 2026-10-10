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
  restaurant: {
    id: "9b2f4c1e-3a7d-4e8f-9c21-5d6e7f8a9b0c",
    name: "Auntie Akos Kitchen",
    phone: "+233240000105",
  },
  timeline: [{ status: "PENDING_PAYMENT", at: "2026-10-09T12:00:00.000Z", reason: null }],
  deliveryCode: null,
  customerActions: ["CANCELLED"],
};

const tags = ["Customer: Orders"];
const loggedIn = [{ cookieAuth: [] }];
const orderId = pathParameter("orderId", "One of your orders");
const notFound = errorResponse("Not yours, or does not exist", "NOT_FOUND", "Order not found");

export const customerOrderPaths = {
  "/api/v1/customer/orders/{orderId}/tracking": {
    get: {
      tags,
      summary: "Live tracking: the rider, where they are, and about how long",
      description:
        "Load once and every minute (for the ETA); the rider's moves arrive over the socket as rider:location in the order's room. The rider and their location are shown only while the order is RIDER_ASSIGNED or PICKED_UP, never after. The ETA is the straight line x 1.4 at an average city speed (etaBasis STRAIGHT_LINE). At most 10 a minute.",
      security: [{ cookieAuth: [] }],
      parameters: [pathParameter("orderId", "One of my orders")],
      responses: {
        200: successResponse("Tracking", {
          orderId: "0f1e2d3c-4b5a-4968-8776-655443322110",
          status: "PICKED_UP",
          isTracked: true,
          restaurant: { name: "Auntie Esi's Kitchen", latitude: 6.6885, longitude: -1.6244 },
          dropoff: { latitude: 6.7045, longitude: -1.6155 },
          rider: {
            firstName: "Kwame",
            photoUrl: null,
            vehicleType: "MOTORBIKE",
            plateNumber: "M-21-GR 1001",
          },
          riderLocation: { latitude: 6.6975, longitude: -1.62, at: "2026-10-10T12:41:05.000Z" },
          etaMinutes: 6,
          etaBasis: "STRAIGHT_LINE",
        }),
        404: errorResponse("Not mine, or no such order", "NOT_FOUND", "Order not found"),
        429: errorResponse(
          "Asked too often",
          "RATE_LIMITED",
          "Too many attempts. Please try again later",
        ),
      },
    },
  },
  "/api/v1/customer/orders/{orderId}": {
    get: {
      tags,
      summary: "One of my orders, with its timeline",
      description:
        "timeline lists every status reached, with times. customerActions lists what the customer may still do (e.g. CANCELLED before the restaurant accepts). deliveryCode is the 4-digit code to show the rider, only while the order is PICKED_UP.",
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
  "/api/v1/customer/orders/{orderId}/payment-status": {
    get: {
      tags,
      summary: "Has my payment gone through? (the server asks Paystack itself)",
      description:
        "Used by the Confirming payment page every few seconds. state is PAID, PENDING, NOT_COMPLETED, FAILED, PROBLEM, CLOSED or NOT_STARTED. A final Paystack answer (success, failed) is recorded with the same code as the webhook; abandoned is reported but not saved. Limited to 30 asks a minute.",
      security: loggedIn,
      parameters: [orderId],
      responses: {
        200: successResponse("Payment state", {
          state: "PAID",
          message: null,
          orderId: "8f2c3a1e-1b2c-4d5e-9f00-112233445566",
          orderNumber: "CH-261009-545694",
          orderStatus: "PAID",
          totalPesewas: 5364,
        }),
        404: notFound,
      },
    },
  },

  "/api/v1/customer/orders/{orderId}/payments": {
    post: {
      tags,
      summary: "Pay for my order with Paystack (card or mobile money)",
      description: [
        "Starts a Paystack checkout for the order's stored total in GHS; open authorizationUrl to pay.",
        "Calling again within 10 minutes returns the same checkout; after a failed payment it starts a new attempt.",
        "Coming back from Paystack does NOT mean paid: wait until the order's paymentStatus is PAID.",
      ].join(" "),
      security: loggedIn,
      parameters: [orderId],
      responses: {
        200: successResponse("Checkout ready", {
          paymentId: "1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e",
          reference: "CH-261009-482193-9F3A1C",
          amountPesewas: 7072,
          currency: "GHS",
          authorizationUrl: "https://checkout.paystack.com/abc123",
          accessCode: "abc123",
        }),
        404: notFound,
        409: errorResponse(
          "Not waiting for payment",
          "ORDER_NOT_PAYABLE",
          "An order that is PAID cannot be paid",
        ),
        502: errorResponse(
          "Paystack did not answer",
          "PAYMENT_PROVIDER_ERROR",
          "Payment service is not responding. Please try again",
        ),
      },
    },
  },

  "/api/v1/customer/orders/{orderId}/receipt": {
    get: {
      tags,
      summary: "The receipt of one of my paid orders",
      description: "Also emailed once when the order is paid. Built from the order's frozen copy.",
      security: loggedIn,
      parameters: [orderId],
      responses: {
        200: successResponse("The receipt", {
          orderNumber: "CH-261009-482193",
          placedAt: "2026-10-09T22:09:31.000Z",
          paymentStatus: "PAID",
          customerName: "Ama Mensah",
          contactPhone: "+233241234567",
          deliveryArea: "Ayeduase",
          deliveryLandmark: "Opposite the KNUST gate",
          deliveryGhanaPostGps: "AK-039-5028",
          restaurantName: "Auntie Akos Kitchen",
          restaurantAddress: "Asokwa Industrial Area, Gate 2, Asokwa, Kumasi",
          restaurantPhone: "+233240000105",
          paidAt: "2026-10-09T12:05:00.000Z",
          paymentMethod: "Mobile money",
          paymentReference: "CH-261009-482193-9F3A1C",
          items: [
            {
              name: "Waakye",
              quantity: 2,
              options: [],
              unitPricePesewas: 3000,
              lineTotalPesewas: 6000,
            },
          ],
          subtotalPesewas: 6000,
          deliveryFeePesewas: 1072,
          serviceFeePesewas: 0,
          discountPesewas: 0,
          totalPesewas: 7072,
        }),
        404: notFound,
        409: errorResponse(
          "Not paid yet",
          "RECEIPT_NOT_AVAILABLE",
          "This order has not been paid yet",
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
