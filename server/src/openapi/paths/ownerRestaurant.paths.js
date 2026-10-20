import { DOCUMENT_TYPES } from "../../models/restaurant/restaurantDocument.model.js";
import { createRestaurantSchema } from "../../validators/restaurant/createRestaurant.validator.js";
import { updateRestaurantSchema } from "../../validators/restaurant/updateRestaurant.validator.js";
import { updateOpeningHoursSchema } from "../../validators/restaurant/updateOpeningHours.validator.js";
import { acceptingOrdersSchema } from "../../validators/restaurant/acceptingOrders.validator.js";
import { errorResponse, fileBody, jsonBody, pathParameter, successResponse } from "../helpers.js";

// What an owner sees about their own restaurant (more than the public card)
const exampleRestaurant = {
  id: "9b2f4c1e-3a7d-4e8f-9c21-5d6e7f8a9b0c",
  ownerId: "5e17c019-6dbc-43d0-8478-6a2f96e1ab6f",
  name: "Auntie Akos Kitchen",
  legalName: "Akos Foods Enterprise",
  description: "Home-style Ghanaian dishes, cooked fresh every morning",
  phone: "+233241234567",
  cuisineTags: ["ghanaian", "local"],
  addressLine: "12 Prempeh II Street",
  area: "Adum",
  city: "Kumasi",
  latitude: 6.6885,
  longitude: -1.6244,
  logoUrl: null,
  coverImageUrl: null,
  status: "PENDING_APPROVAL",
  rejectionReason: null,
  isAcceptingOrders: true,
  minOrderPesewas: 3000,
  deliveryRadiusKm: 8,
  prepTimeMinutes: 25,
  approvedAt: null,
  openingHours: [{ dayOfWeek: 1, isClosed: false, opensAt: "08:00:00", closesAt: "21:00:00" }],
};

const exampleDocument = {
  id: "3b4c5d6e-7f8a-4b9c-8d0e-1f2a3b4c5d6f",
  documentType: "TAX_CERTIFICATE",
  format: "pdf",
  verificationStatus: "PENDING",
  rejectionReason: null,
  updatedAt: "2026-10-07T10:00:00.000Z",
};

const tags = ["Owner: Restaurants"];
const loggedIn = [{ cookieAuth: [] }];
const restaurantId = pathParameter("restaurantId", "One of your restaurants");

const validationError = errorResponse("Invalid input", "VALIDATION_ERROR", "Invalid request data");
const notFound = errorResponse("Not yours, or does not exist", "NOT_FOUND", "Restaurant not found");
const phoneNotVerified = errorResponse(
  "Phone not verified",
  "ACCOUNT_NOT_VERIFIED",
  "Please verify your phone number first",
);
const suspended = errorResponse(
  "Restaurant is suspended",
  "FORBIDDEN",
  "This restaurant is suspended and cannot be edited. Please contact support",
);
const badFile = errorResponse(
  "Wrong file type, over 5 MB, or no file",
  "UNSUPPORTED_FILE_TYPE",
  "Only these file types are allowed: image/jpeg, image/png, image/webp",
);

export const ownerRestaurantPaths = {
  "/api/v1/owner/restaurants": {
    post: {
      tags,
      summary: "Submit a new restaurant for approval",
      description: "It starts as PENDING_APPROVAL. One owner may have several restaurants.",
      security: loggedIn,
      requestBody: jsonBody(createRestaurantSchema, {
        name: "Auntie Akos Kitchen",
        legalName: "Akos Foods Enterprise",
        description: "Home-style Ghanaian dishes",
        phone: "024 123 4567",
        cuisineTags: ["Ghanaian"],
        addressLine: "12 Prempeh II Street",
        area: "Adum",
        latitude: 6.6885,
        longitude: -1.6244,
        openingHours: [{ dayOfWeek: 1, isClosed: false, opensAt: "08:00", closesAt: "21:00" }],
      }),
      responses: {
        201: successResponse("Submitted", exampleRestaurant),
        400: validationError,
        403: phoneNotVerified,
      },
    },
    get: {
      tags,
      summary: "List my restaurants",
      security: loggedIn,
      responses: {
        200: successResponse("My restaurants", [exampleRestaurant]),
        403: phoneNotVerified,
      },
    },
  },

  "/api/v1/owner/restaurants/{restaurantId}": {
    get: {
      tags,
      summary: "One of my restaurants",
      security: loggedIn,
      parameters: [restaurantId],
      responses: {
        200: successResponse("My restaurant", exampleRestaurant),
        404: notFound,
      },
    },
    patch: {
      tags,
      summary: "Edit profile and delivery settings",
      description:
        "Send only the fields you want to change. Changing the legal name of an approved restaurant sends it back for admin review.",
      security: loggedIn,
      parameters: [restaurantId],
      requestBody: jsonBody(updateRestaurantSchema, { prepTimeMinutes: 30 }),
      responses: {
        200: successResponse("Saved", { ...exampleRestaurant, prepTimeMinutes: 30 }),
        400: validationError,
        403: suspended,
        404: notFound,
      },
    },
  },

  "/api/v1/owner/restaurants/{restaurantId}/opening-hours": {
    put: {
      tags,
      summary: "Replace the opening hours for the whole week",
      description: "Times are Africa/Accra. Hours may cross midnight, e.g. 18:00 to 02:00.",
      security: loggedIn,
      parameters: [restaurantId],
      requestBody: jsonBody(updateOpeningHoursSchema, {
        openingHours: [{ dayOfWeek: 5, isClosed: false, opensAt: "18:00", closesAt: "02:00" }],
      }),
      responses: {
        200: successResponse("Saved", exampleRestaurant),
        400: validationError,
        403: suspended,
        404: notFound,
      },
    },
  },

  "/api/v1/owner/restaurants/{restaurantId}/accepting-orders": {
    patch: {
      tags,
      summary: "Open or close for new orders",
      description: "Only for approved restaurants, and only when the owner's account is ACTIVE.",
      security: loggedIn,
      parameters: [restaurantId],
      requestBody: jsonBody(acceptingOrdersSchema, { isAcceptingOrders: false }),
      responses: {
        200: successResponse("Saved", {
          ...exampleRestaurant,
          status: "APPROVED",
          isAcceptingOrders: false,
        }),
        400: validationError,
        404: notFound,
        409: errorResponse(
          "Not approved yet",
          "CONFLICT",
          "Only approved restaurants can open or close for orders",
        ),
      },
    },
  },

  "/api/v1/owner/restaurants/{restaurantId}/resubmit": {
    post: {
      tags,
      summary: "Send a rejected restaurant back for approval",
      security: loggedIn,
      parameters: [restaurantId],
      responses: {
        200: successResponse("Back in the review queue", exampleRestaurant),
        404: notFound,
        409: errorResponse(
          "Not rejected",
          "INVALID_STATUS_TRANSITION",
          "A restaurant that is APPROVED cannot be resubmitted",
        ),
      },
    },
  },

  "/api/v1/owner/restaurants/{restaurantId}/logo": {
    put: {
      tags,
      summary: "Upload or replace the logo",
      description: "JPEG, PNG or WebP, at most 5 MB. Saved as WebP. The old logo is deleted.",
      security: loggedIn,
      parameters: [restaurantId],
      requestBody: fileBody("image", "The logo image"),
      responses: {
        200: successResponse("Saved", {
          ...exampleRestaurant,
          logoUrl:
            "https://res.cloudinary.com/demo/image/upload/cibushub/restaurants/logos/abc.webp",
        }),
        400: badFile,
        403: suspended,
        404: notFound,
      },
    },
  },

  "/api/v1/owner/restaurants/{restaurantId}/cover": {
    put: {
      tags,
      summary: "Upload or replace the cover image",
      description: "JPEG, PNG or WebP, at most 5 MB. Saved as WebP. The old cover is deleted.",
      security: loggedIn,
      parameters: [restaurantId],
      requestBody: fileBody("image", "The cover image"),
      responses: {
        200: successResponse("Saved", {
          ...exampleRestaurant,
          coverImageUrl:
            "https://res.cloudinary.com/demo/image/upload/cibushub/restaurants/covers/abc.webp",
        }),
        400: badFile,
        403: suspended,
        404: notFound,
      },
    },
  },

  "/api/v1/owner/restaurants/{restaurantId}/documents": {
    get: {
      tags,
      summary: "Which verification documents I have uploaded",
      description: "Owners never get a link back. Only admins can open documents.",
      security: loggedIn,
      parameters: [restaurantId],
      responses: {
        200: successResponse("My documents", [exampleDocument]),
        404: notFound,
      },
    },
  },

  "/api/v1/owner/restaurants/{restaurantId}/documents/{documentType}": {
    put: {
      tags,
      summary: "Upload or replace a verification document",
      description:
        "JPEG, PNG, WebP or PDF, at most 5 MB. Stored privately. A new file goes back to PENDING until an admin checks it. BUSINESS_REGISTRATION and TAX_CERTIFICATE are required before approval.",
      security: loggedIn,
      parameters: [
        restaurantId,
        {
          name: "documentType",
          in: "path",
          required: true,
          schema: {
            type: "string",
            enum: DOCUMENT_TYPES,
          },
        },
      ],
      requestBody: fileBody("file", "The document (image or PDF)"),
      responses: {
        200: successResponse("Saved", exampleDocument),
        400: badFile,
        403: suspended,
        404: notFound,
      },
    },
  },
};
