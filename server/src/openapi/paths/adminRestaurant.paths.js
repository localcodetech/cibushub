import { adminListRestaurantsSchema } from "../../validators/restaurant/adminListRestaurants.validator.js";
import {
  rejectRestaurantSchema,
  suspendRestaurantSchema,
} from "../../validators/restaurant/reviewRestaurant.validator.js";
import { reviewDocumentSchema } from "../../validators/restaurant/document.validator.js";
import { DOCUMENT_TYPES } from "../../models/restaurant/restaurantDocument.model.js";
import {
  errorResponse,
  jsonBody,
  listResponse,
  pathParameter,
  queryParameters,
  successResponse,
} from "../helpers.js";

// What an admin sees: everything, including the owner and review details
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
  status: "PENDING_APPROVAL",
  rejectionReason: null,
  isAcceptingOrders: true,
  minOrderPesewas: 3000,
  deliveryRadiusKm: 8,
  prepTimeMinutes: 25,
  approvedAt: null,
  createdAt: "2026-10-06T09:00:00.000Z",
  openingHours: [{ dayOfWeek: 1, isClosed: false, opensAt: "08:00:00", closesAt: "21:00:00" }],
};

const tags = ["Admin: Restaurants"];
const loggedIn = [{ cookieAuth: [] }];
const restaurantId = pathParameter("restaurantId", "Any restaurant");

const validationError = errorResponse("Invalid input", "VALIDATION_ERROR", "Invalid request data");
const notFound = errorResponse("Does not exist", "NOT_FOUND", "Restaurant not found");
const notAdmin = errorResponse(
  "Not an admin",
  "FORBIDDEN",
  "You do not have permission to do this",
);

export const adminRestaurantPaths = {
  "/api/v1/admin/restaurants": {
    get: {
      tags,
      summary: "All restaurants, oldest first (the review queue)",
      description: "Filter with ?status=PENDING_APPROVAL to see what is waiting for review.",
      security: loggedIn,
      parameters: queryParameters(adminListRestaurantsSchema),
      responses: {
        200: listResponse("One page of restaurants", exampleRestaurant, {
          page: 1,
          pageSize: 20,
          totalItems: 1,
          totalPages: 1,
        }),
        400: validationError,
        403: notAdmin,
      },
    },
  },

  "/api/v1/admin/restaurants/{restaurantId}": {
    get: {
      tags,
      summary: "Any restaurant with its opening hours, whatever its status",
      description:
        "Also owner { id, fullName, email, phone } and performance for the last 30 days: totalOrders, ordersByStatus (paid or later), deliveredPesewas, averageRating, reviewCount and the 10 newest orders [AC-ADM-03].",
      security: loggedIn,
      parameters: [restaurantId],
      responses: {
        200: successResponse("The restaurant", exampleRestaurant),
        403: notAdmin,
        404: notFound,
      },
    },
  },

  "/api/v1/admin/restaurants/{restaurantId}/documents": {
    get: {
      tags,
      summary: "Verification documents, each with a link that works for 5 minutes",
      security: loggedIn,
      parameters: [restaurantId],
      responses: {
        200: successResponse("The documents", [
          {
            id: "3b4c5d6e-7f8a-4b9c-8d0e-1f2a3b4c5d6f",
            documentType: "TAX_CERTIFICATE",
            format: "pdf",
            verificationStatus: "PENDING",
            rejectionReason: null,
            updatedAt: "2026-10-07T10:00:00.000Z",
            url: "https://api.cloudinary.com/v1_1/demo/image/download?public_id=...&expires_at=...",
          },
        ]),
        403: notAdmin,
        404: notFound,
      },
    },
  },

  "/api/v1/admin/restaurants/{restaurantId}/documents/{documentType}": {
    patch: {
      tags,
      summary: "Mark one document VERIFIED or REJECTED",
      description:
        "A rejection needs a reason (at least 10 characters); the owner sees it and uploads a new file, which goes back to PENDING. Written to the audit log.",
      security: loggedIn,
      parameters: [
        restaurantId,
        {
          name: "documentType",
          in: "path",
          required: true,
          schema: { type: "string", enum: DOCUMENT_TYPES },
        },
      ],
      requestBody: jsonBody(reviewDocumentSchema, {
        status: "REJECTED",
        reason: "The tax certificate is cut off at the bottom. Please upload the full page.",
      }),
      responses: {
        200: successResponse("Saved", {
          id: "3b4c5d6e-7f8a-4b9c-8d0e-1f2a3b4c5d6f",
          documentType: "TAX_CERTIFICATE",
          format: "pdf",
          verificationStatus: "REJECTED",
          rejectionReason:
            "The tax certificate is cut off at the bottom. Please upload the full page.",
          updatedAt: "2026-10-07T10:00:00.000Z",
        }),
        400: validationError,
        403: notAdmin,
        404: errorResponse("Not uploaded", "NOT_FOUND", "This document has not been uploaded"),
      },
    },
  },

  "/api/v1/admin/restaurants/{restaurantId}/approve": {
    post: {
      tags,
      summary: "Approve a pending restaurant, or reinstate a suspended one",
      description:
        "A pending restaurant needs its BUSINESS_REGISTRATION and TAX_CERTIFICATE marked VERIFIED first, or the answer is 409 DOCUMENTS_NOT_VERIFIED (details list the missing ones). The owner gets an SMS, and their account becomes ACTIVE on their first approval. Written to the audit log.",
      security: loggedIn,
      parameters: [restaurantId],
      responses: {
        200: successResponse("Approved", {
          ...exampleRestaurant,
          status: "APPROVED",
          approvedAt: "2026-10-07T10:00:00.000Z",
        }),
        403: notAdmin,
        404: notFound,
        409: errorResponse(
          "Not allowed from the current status",
          "INVALID_STATUS_TRANSITION",
          "A restaurant that is REJECTED cannot be changed to APPROVED",
        ),
      },
    },
  },

  "/api/v1/admin/restaurants/{restaurantId}/reject": {
    post: {
      tags,
      summary: "Reject a pending restaurant",
      description:
        "The reason (at least 10 characters) is shown to the owner and sent by SMS. Written to the audit log.",
      security: loggedIn,
      parameters: [restaurantId],
      requestBody: jsonBody(rejectRestaurantSchema, {
        reason: "The FDA certificate photo is blurry. Please upload a clear copy.",
      }),
      responses: {
        200: successResponse("Rejected", {
          ...exampleRestaurant,
          status: "REJECTED",
          rejectionReason: "The FDA certificate photo is blurry. Please upload a clear copy.",
        }),
        400: validationError,
        403: notAdmin,
        404: notFound,
        409: errorResponse(
          "Not pending",
          "INVALID_STATUS_TRANSITION",
          "A restaurant that is APPROVED cannot be changed to REJECTED",
        ),
      },
    },
  },

  "/api/v1/admin/restaurants/{restaurantId}/suspend": {
    post: {
      tags,
      summary: "Suspend an approved restaurant",
      description:
        "A reason (at least 10 characters) is required. The restaurant disappears from public listings. Written to the audit log.",
      security: loggedIn,
      parameters: [restaurantId],
      requestBody: jsonBody(suspendRestaurantSchema, {
        reason: "Repeated food safety complaints",
      }),
      responses: {
        200: successResponse("Suspended", { ...exampleRestaurant, status: "SUSPENDED" }),
        400: validationError,
        403: notAdmin,
        404: notFound,
        409: errorResponse(
          "Not approved",
          "INVALID_STATUS_TRANSITION",
          "A restaurant that is PENDING_APPROVAL cannot be changed to SUSPENDED",
        ),
      },
    },
  },
};
