import {
  adminListRidersSchema,
  rejectRiderSchema,
  suspendRiderSchema,
} from "../../validators/rider/reviewRider.validator.js";
import {
  errorResponse,
  jsonBody,
  listResponse,
  pathParameter,
  queryParameters,
  successResponse,
} from "../helpers.js";

const tags = ["Admin: Riders"];
const loggedIn = [{ cookieAuth: [] }];
const riderId = pathParameter("riderId", "The rider application's id");

// What an admin sees: the application and the rider's account
const exampleRider = {
  id: "3c1d2e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f",
  status: "PENDING_APPROVAL",
  vehicleType: "MOTORBIKE",
  plateNumber: "M-21-GR 1234",
  ghanaCardNumber: "GHA-123456789-0",
  rejectionReason: null,
  submittedAt: "2026-10-10T12:00:00.000Z",
  approvedAt: null,
  rider: {
    id: "7d8e9f0a-1b2c-4d3e-8f4a-5b6c7d8e9f0a",
    fullName: "Yaw Mensah",
    phone: "+233241110000",
    email: "yaw.rider@example.com",
    photoUrl: "https://res.cloudinary.com/demo/avatars/yaw.webp",
    accountStatus: "PENDING_APPROVAL",
  },
};

const notFound = errorResponse("No such rider", "NOT_FOUND", "Rider not found");
const badMove = errorResponse(
  "Not allowed from the current status",
  "INVALID_STATUS_TRANSITION",
  "A rider who is PENDING_APPROVAL cannot be changed to SUSPENDED",
);

export const adminRiderPaths = {
  "/api/v1/admin/riders": {
    get: {
      tags,
      summary: "Rider applications (the review queue)",
      description: "Oldest submission first. Drafts are left out unless status=DRAFT.",
      security: loggedIn,
      parameters: queryParameters(adminListRidersSchema),
      responses: { 200: listResponse("Applications", exampleRider) },
    },
  },
  "/api/v1/admin/riders/{riderId}": {
    get: {
      tags,
      summary: "One rider application",
      security: loggedIn,
      parameters: [riderId],
      responses: { 200: successResponse("The application", exampleRider), 404: notFound },
    },
  },
  "/api/v1/admin/riders/{riderId}/documents": {
    get: {
      tags,
      summary: "The rider's Ghana Card and licence",
      description: "Each url works for 5 minutes.",
      security: loggedIn,
      parameters: [riderId],
      responses: {
        200: successResponse("Documents", [
          {
            documentType: "GHANA_CARD",
            format: "pdf",
            updatedAt: "2026-10-10T12:00:00.000Z",
            url: "https://res.cloudinary.com/…",
          },
        ]),
        404: notFound,
      },
    },
  },
  "/api/v1/admin/riders/{riderId}/approve": {
    post: {
      tags,
      summary: "Approve a pending rider, or reinstate a suspended one",
      description:
        "The first approval also makes the rider's account ACTIVE. SMS sent; audit logged.",
      security: loggedIn,
      parameters: [riderId],
      responses: {
        200: successResponse("Approved", { ...exampleRider, status: "APPROVED" }),
        404: notFound,
        409: badMove,
      },
    },
  },
  "/api/v1/admin/riders/{riderId}/reject": {
    post: {
      tags,
      summary: "Reject a pending rider",
      description: "The rider sees the reason and can resubmit. SMS sent; audit logged.",
      security: loggedIn,
      parameters: [riderId],
      requestBody: jsonBody(rejectRiderSchema, { reason: "The Ghana Card photo is blurry" }),
      responses: {
        200: successResponse("Rejected", { ...exampleRider, status: "REJECTED" }),
        404: notFound,
        409: badMove,
      },
    },
  },
  "/api/v1/admin/riders/{riderId}/suspend": {
    post: {
      tags,
      summary: "Suspend an approved rider",
      description: "No more delivery offers until reinstated. SMS sent; audit logged.",
      security: loggedIn,
      parameters: [riderId],
      requestBody: jsonBody(suspendRiderSchema, {
        reason: "Several customers reported rude behaviour",
      }),
      responses: {
        200: successResponse("Suspended", { ...exampleRider, status: "SUSPENDED" }),
        404: notFound,
        409: badMove,
      },
    },
  },
};
