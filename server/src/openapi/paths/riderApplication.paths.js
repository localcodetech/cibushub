import { riderDetailsSchema } from "../../validators/rider/riderApplication.validator.js";
import { errorResponse, fileBody, jsonBody, successResponse } from "../helpers.js";

const tags = ["Rider: Application"];
const loggedIn = [{ cookieAuth: [] }];

// What the rider sees about their own application: never document links or Cloudinary IDs
const exampleApplication = {
  status: "DRAFT",
  vehicleType: "MOTORBIKE",
  plateNumber: "M-21-GR 1234",
  ghanaCardNumber: "GHA-123456789-0",
  rejectionReason: null,
  submittedAt: null,
  approvedAt: null,
  photoUrl: "https://res.cloudinary.com/demo/avatars/image-1.webp",
  documents: [{ documentType: "GHANA_CARD", format: "pdf", updatedAt: "2026-10-10T12:00:00.000Z" }],
  missing: ["DRIVERS_LICENCE"],
  canEdit: true,
};

const locked = errorResponse(
  "Under review or approved: can't be changed",
  "APPLICATION_LOCKED",
  "Your application is being reviewed and can't be changed now",
);
const notRider = errorResponse("Not a rider, or phone not verified", "FORBIDDEN", "Forbidden");

export const riderApplicationPaths = {
  "/api/v1/rider/application": {
    get: {
      tags,
      summary: "My rider application",
      description:
        "status is NOT_STARTED, DRAFT, PENDING_APPROVAL, APPROVED, REJECTED or SUSPENDED. missing lists what Submit still needs (DETAILS, PHOTO, GHANA_CARD, DRIVERS_LICENCE). Works while the account waits for approval.",
      security: loggedIn,
      responses: {
        200: successResponse("The application", exampleApplication),
        403: notRider,
      },
    },
    put: {
      tags,
      summary: "Save vehicle and Ghana Card details",
      description:
        "Creates the application (DRAFT) the first time. plateNumber is required for MOTORBIKE and CAR and ignored for BICYCLE. Saved in capitals.",
      security: loggedIn,
      requestBody: jsonBody(riderDetailsSchema, {
        vehicleType: "MOTORBIKE",
        plateNumber: "M-21-GR 1234",
        ghanaCardNumber: "GHA-123456789-0",
      }),
      responses: {
        200: successResponse("Saved", exampleApplication),
        400: errorResponse("Invalid details", "VALIDATION_ERROR", "Enter the plate number"),
        409: locked,
      },
    },
  },
  "/api/v1/rider/application/photo": {
    put: {
      tags,
      summary: "Upload my photo",
      description: "JPEG, PNG or WebP, at most 5 MB. Becomes the rider's profile photo.",
      security: loggedIn,
      requestBody: fileBody("image", "The photo"),
      responses: {
        200: successResponse("Saved", exampleApplication),
        409: locked,
      },
    },
  },
  "/api/v1/rider/application/documents/{documentType}": {
    put: {
      tags,
      summary: "Upload or replace the Ghana Card or driver's licence",
      description:
        "JPEG, PNG, WebP or PDF, at most 5 MB. Stored privately; only admins can view it.",
      security: loggedIn,
      parameters: [
        {
          name: "documentType",
          in: "path",
          required: true,
          schema: { type: "string", enum: ["GHANA_CARD", "DRIVERS_LICENCE"] },
        },
      ],
      requestBody: fileBody("document", "The document (image or PDF)"),
      responses: {
        200: successResponse("Saved", exampleApplication),
        409: errorResponse(
          "Details not saved yet",
          "DETAILS_REQUIRED",
          "Fill in your vehicle details first",
        ),
      },
    },
  },
  "/api/v1/rider/application/submit": {
    post: {
      tags,
      summary: "Submit for admin review",
      description: "Moves the application to PENDING_APPROVAL and alerts admins live.",
      security: loggedIn,
      responses: {
        200: successResponse("Submitted", {
          ...exampleApplication,
          status: "PENDING_APPROVAL",
          missing: [],
          canEdit: false,
        }),
        400: errorResponse(
          "Something is missing (listed in details)",
          "APPLICATION_INCOMPLETE",
          "Some details are still missing",
        ),
        409: locked,
      },
    },
  },
};
