import {
  createAddressSchema,
  updateAddressSchema,
} from "../../validators/address/address.validator.js";
import { errorResponse, jsonBody, pathParameter, successResponse } from "../helpers.js";

const exampleAddress = {
  id: "4d5e6f7a-8b9c-4d0e-9f1a-2b3c4d5e6f7a",
  userId: "5e17c019-6dbc-43d0-8478-6a2f96e1ab6f",
  label: "HOME",
  latitude: 6.6885,
  longitude: -1.6244,
  ghanaPostGps: "AK-039-5028",
  area: "Adum",
  landmark: "Opposite the Kingsway building",
  deliveryInstructions: "Call when you reach the gate",
  isDefault: false,
  createdAt: "2026-10-07T10:00:00.000Z",
  updatedAt: "2026-10-07T10:00:00.000Z",
};

const tags = ["Customer: Addresses"];
const loggedIn = [{ cookieAuth: [] }];
const addressId = pathParameter("addressId", "One of your addresses");

const validationError = errorResponse("Invalid input", "VALIDATION_ERROR", "Invalid request data");
const notFound = errorResponse("Not yours, or does not exist", "NOT_FOUND", "Address not found");
const notCustomer = errorResponse(
  "Not a customer",
  "FORBIDDEN",
  "You do not have permission to do this",
);

export const customerAddressPaths = {
  "/api/v1/customer/addresses": {
    get: {
      tags,
      summary: "My saved delivery addresses, default first",
      security: loggedIn,
      responses: {
        200: successResponse("My addresses", [exampleAddress]),
        403: notCustomer,
      },
    },
    post: {
      tags,
      summary: "Save a new delivery address",
      description:
        "The map pin (latitude and longitude) is required and must be inside Ghana: riders navigate by it. Ghana Post GPS is checked for format only.",
      security: loggedIn,
      requestBody: jsonBody(createAddressSchema, {
        label: "HOME",
        latitude: 6.6885,
        longitude: -1.6244,
        ghanaPostGps: "AK-039-5028",
        area: "Adum",
        landmark: "Opposite the Kingsway building",
        deliveryInstructions: "Call when you reach the gate",
      }),
      responses: {
        201: successResponse("Saved (the first address becomes the default)", {
          ...exampleAddress,
          isDefault: true,
        }),
        400: validationError,
        403: notCustomer,
        409: errorResponse(
          "Already 10 addresses",
          "ADDRESS_LIMIT_REACHED",
          "You can save up to 10 addresses. Delete one to add another",
        ),
      },
    },
  },

  "/api/v1/customer/addresses/{addressId}": {
    patch: {
      tags,
      summary: "Edit one of my addresses",
      description: "Send only what changes. To move the pin, send both latitude and longitude.",
      security: loggedIn,
      parameters: [addressId],
      requestBody: jsonBody(updateAddressSchema, { landmark: "Behind the post office" }),
      responses: {
        200: successResponse("Saved", { ...exampleAddress, landmark: "Behind the post office" }),
        400: validationError,
        404: notFound,
      },
    },
    delete: {
      tags,
      summary: "Delete one of my addresses",
      description: "Deleting the default address makes the newest address left the default.",
      security: loggedIn,
      parameters: [addressId],
      responses: {
        200: successResponse("Deleted", null),
        404: notFound,
      },
    },
  },

  "/api/v1/customer/addresses/{addressId}/default": {
    post: {
      tags,
      summary: "Make this my default address",
      description: "Exactly one address is the default; it is pre-selected at checkout.",
      security: loggedIn,
      parameters: [addressId],
      responses: {
        200: successResponse("Now the default", { ...exampleAddress, isDefault: true }),
        404: notFound,
      },
    },
  },
};
