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
};
