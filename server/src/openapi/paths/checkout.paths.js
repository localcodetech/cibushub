import { checkoutQuoteSchema } from "../../validators/checkout/checkout.validator.js";
import { errorResponse, jsonBody, successResponse } from "../helpers.js";

const exampleQuote = {
  restaurant: {
    id: "9b2f4c1e-3a7d-4e8f-9c21-5d6e7f8a9b0c",
    name: "Auntie Akos Kitchen",
    openStatus: { isOpen: true, label: "Open" },
    minOrderPesewas: 2000,
    latitude: 6.6885,
    longitude: -1.6244,
    deliveryRadiusKm: 5,
  },
  lines: [
    {
      menuItemId: "7f8e9d0c-1b2a-4c3d-9e4f-5a6b7c8d9e0f",
      name: "Waakye",
      quantity: 2,
      optionIds: [],
      options: [],
      unitPricePesewas: 3000,
      lineTotalPesewas: 6000,
      problems: [],
    },
  ],
  subtotalPesewas: 6000,
  deliveryFeePesewas: 1072,
  serviceFeePesewas: 0,
  discountPesewas: 0,
  totalPesewas: 7072,
  delivery: { straightLineKm: 2.2, roadMeters: 2860, radiusKm: 5, isInRange: true },
  deliveryAddress: {
    id: "4d5e6f7a-8b9c-4d0e-9f1a-2b3c4d5e6f7a",
    label: "HOME",
    latitude: 6.6745,
    longitude: -1.61,
    area: "Adum",
  },
  contactPhone: "+233241234567",
  paymentMethods: ["PAYSTACK"],
  problems: [],
  hasChanges: false,
  canPlaceOrder: true,
  pricingSnapshot: {
    distanceSource: "HAVERSINE",
    basePesewas: 500,
    perKmPesewas: 200,
    roadFactor: 1.3,
    straightLineKm: 2.2,
    roadMeters: 2860,
    serviceFeePesewas: 0,
  },
};

const exampleOrder = {
  id: "6a7b8c9d-0e1f-4a2b-8c3d-4e5f6a7b8c9d",
  orderNumber: "CH-261009-482193",
  customerId: "5e17c019-6dbc-43d0-8478-6a2f96e1ab6f",
  restaurantId: "9b2f4c1e-3a7d-4e8f-9c21-5d6e7f8a9b0c",
  status: "PENDING_PAYMENT",
  paymentMethod: "PAYSTACK",
  paymentStatus: "UNPAID",
  subtotalPesewas: 6000,
  deliveryFeePesewas: 1072,
  serviceFeePesewas: 0,
  discountPesewas: 0,
  totalPesewas: 7072,
  deliveryDistanceMeters: 2860,
  deliveryLabel: "HOME",
  deliveryLatitude: 6.6745,
  deliveryLongitude: -1.61,
  deliveryLandmark: "Blue gate",
  contactPhone: "+233241234567",
  restaurantNote: "Less pepper please",
  riderNote: "Call on arrival",
  items: [
    {
      id: "8c9d0e1f-2a3b-4c4d-9e5f-6a7b8c9d0e1f",
      menuItemId: "7f8e9d0c-1b2a-4c3d-9e4f-5a6b7c8d9e0f",
      name: "Waakye",
      basePricePesewas: 3000,
      unitPricePesewas: 3000,
      quantity: 2,
      lineTotalPesewas: 6000,
      options: [],
    },
  ],
  statusHistory: [
    {
      fromStatus: null,
      toStatus: "PENDING_PAYMENT",
      actorRole: "CUSTOMER",
      reason: null,
      createdAt: "2026-10-09T12:00:00.000Z",
    },
  ],
  createdAt: "2026-10-09T12:00:00.000Z",
};

export const checkoutPaths = {
  "/api/v1/customer/checkout/quote": {
    post: {
      tags: ["Customer: Checkout"],
      summary: "The checkout summary, worked out by the server",
      description: [
        "Never send prices or totals: the server works them out from the menu.",
        "Delivery fee = GHS 5.00 + GHS 2.00 per road km (road km = straight line x 1.3), see docs/pricing.md.",
        "Extra problem code: OUT_OF_DELIVERY_RANGE. canPlaceOrder is false while there is any problem.",
      ].join(" "),
      security: [{ cookieAuth: [] }],
      requestBody: jsonBody(checkoutQuoteSchema, {
        restaurantId: "9b2f4c1e-3a7d-4e8f-9c21-5d6e7f8a9b0c",
        addressId: "4d5e6f7a-8b9c-4d0e-9f1a-2b3c4d5e6f7a",
        items: [
          {
            menuItemId: "7f8e9d0c-1b2a-4c3d-9e4f-5a6b7c8d9e0f",
            quantity: 2,
            optionIds: [],
            seenUnitPricePesewas: 3000,
          },
        ],
        restaurantNote: "Less pepper please",
        riderNote: "Call when you reach the gate",
      }),
      responses: {
        200: successResponse("The summary", exampleQuote),
        400: errorResponse("Invalid input", "VALIDATION_ERROR", "Invalid request data"),
        403: errorResponse("Not a customer", "FORBIDDEN", "You do not have permission to do this"),
        404: errorResponse("Not your address", "NOT_FOUND", "Address not found"),
      },
    },
  },

  "/api/v1/customer/orders": {
    post: {
      tags: ["Customer: Checkout"],
      summary: "Place the order",
      description: [
        "Same body as the quote. Send an Idempotency-Key header: one new random key per tap on Place order, and the SAME key on retries.",
        "The same key again returns the same order (200) instead of a second one (201 the first time).",
        "The server prices everything again inside one transaction. Any problem returns 409 CHECKOUT_BLOCKED and nothing is saved.",
        "A new order is PENDING_PAYMENT.",
      ].join(" "),
      security: [{ cookieAuth: [] }],
      parameters: [
        {
          name: "Idempotency-Key",
          in: "header",
          required: true,
          description: "8 to 64 letters, digits, - or _",
          schema: { type: "string", example: "tap-7f3a9c2e-0b41" },
        },
      ],
      requestBody: jsonBody(checkoutQuoteSchema, {
        restaurantId: "9b2f4c1e-3a7d-4e8f-9c21-5d6e7f8a9b0c",
        addressId: "4d5e6f7a-8b9c-4d0e-9f1a-2b3c4d5e6f7a",
        items: [
          {
            menuItemId: "7f8e9d0c-1b2a-4c3d-9e4f-5a6b7c8d9e0f",
            quantity: 2,
            optionIds: [],
            seenUnitPricePesewas: 3000,
          },
        ],
        restaurantNote: "Less pepper please",
      }),
      responses: {
        201: successResponse("Order placed", exampleOrder),
        200: successResponse("Same key again: the same order", exampleOrder),
        400: errorResponse("Invalid input or no key", "VALIDATION_ERROR", "Invalid request data"),
        409: {
          description: "Something changed; nothing was saved",
          content: {
            "application/json": {
              example: {
                success: false,
                error: {
                  code: "CHECKOUT_BLOCKED",
                  message: "Something in your order changed. Please review it and try again",
                  details: [
                    {
                      code: "PRICE_CHANGED",
                      message: "The price changed from 3000 to 3500 pesewas",
                      menuItemId: "7f8e9d0c-1b2a-4c3d-9e4f-5a6b7c8d9e0f",
                      name: "Waakye",
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },
  },
};
