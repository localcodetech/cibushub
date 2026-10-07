import { cartCheckSchema } from "../../validators/cart/cartCheck.validator.js";
import { errorResponse, jsonBody, successResponse } from "../helpers.js";

const exampleCheckedCart = {
  restaurant: {
    id: "9b2f4c1e-3a7d-4e8f-9c21-5d6e7f8a9b0c",
    name: "Auntie Akos Kitchen",
    openStatus: { isOpen: true, label: "Open" },
    minOrderPesewas: 2000,
  },
  lines: [
    {
      menuItemId: "7f8e9d0c-1b2a-4c3d-9e4f-5a6b7c8d9e0f",
      name: "Waakye",
      quantity: 2,
      optionIds: ["3b4c5d6e-7f8a-4b9c-8d0e-1f2a3b4c5d6f"],
      options: [
        { id: "3b4c5d6e-7f8a-4b9c-8d0e-1f2a3b4c5d6f", name: "Fish", extraPricePesewas: 500 },
      ],
      unitPricePesewas: 4500,
      lineTotalPesewas: 9000,
      problems: [{ code: "PRICE_CHANGED", message: "The price changed from 3500 to 4500 pesewas" }],
    },
  ],
  subtotalPesewas: 9000,
  problems: [],
  hasChanges: true,
  canCheckout: false,
};

export const cartPaths = {
  "/api/v1/cart/check": {
    post: {
      tags: ["Cart"],
      summary: "Re-check a cart against today's menu",
      description: [
        "No login needed. The browser only remembers choices; this endpoint works out the real prices.",
        "Line problems: ITEM_UNAVAILABLE, NOT_ENOUGH_STOCK, OPTION_UNAVAILABLE, OPTIONS_INVALID, PRICE_CHANGED.",
        "Restaurant problems: RESTAURANT_UNAVAILABLE, RESTAURANT_CLOSED, BELOW_MINIMUM_ORDER.",
        "canCheckout is false while anything changed. To accept a new price, send it back as seenUnitPricePesewas.",
      ].join(" "),
      requestBody: jsonBody(cartCheckSchema, {
        restaurantId: "9b2f4c1e-3a7d-4e8f-9c21-5d6e7f8a9b0c",
        items: [
          {
            menuItemId: "7f8e9d0c-1b2a-4c3d-9e4f-5a6b7c8d9e0f",
            quantity: 2,
            optionIds: ["3b4c5d6e-7f8a-4b9c-8d0e-1f2a3b4c5d6f"],
            seenUnitPricePesewas: 3500,
          },
        ],
      }),
      responses: {
        200: successResponse("The cart, priced from today's menu", exampleCheckedCart),
        400: errorResponse("Invalid cart", "VALIDATION_ERROR", "Invalid request data"),
      },
    },
  },
};
