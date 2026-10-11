import {
  adminListUsersSchema,
  userActionSchema,
} from "../../validators/admin/adminUsers.validator.js";
import {
  errorResponse,
  jsonBody,
  listResponse,
  pathParameter,
  queryParameters,
  successResponse,
} from "../helpers.js";

const tags = ["Admin: Users"];
const loggedIn = [{ cookieAuth: [] }];
const userId = pathParameter("userId", "Any account");

const exampleUser = {
  id: "9a8b7c6d-5e4f-4321-8765-0fedcba98765",
  fullName: "Kofi Adjei",
  email: "kofi.customer@example.com",
  phone: "+233240000004",
  role: "CUSTOMER",
  status: "ACTIVE",
  lastLoginAt: "2026-10-10T23:37:00.000Z",
  createdAt: "2026-10-07T00:25:00.000Z",
};

const actionResponses = {
  200: successResponse("Done", exampleUser),
  400: errorResponse("No reason", "VALIDATION_ERROR", "Invalid request data"),
  403: errorResponse(
    "An admin account",
    "ADMIN_ACCOUNT",
    "Admin accounts are managed by the super admin",
  ),
  404: errorResponse("No such user", "NOT_FOUND", "User not found"),
};

export const adminUserPaths = {
  "/api/v1/admin/users": {
    get: {
      tags,
      summary: "Every account, newest first, with search and filters",
      description: "q: part of a name or email, or a phone in any format [AC-ADM-02].",
      security: loggedIn,
      parameters: queryParameters(adminListUsersSchema),
      responses: {
        200: listResponse("One page of users", exampleUser, {
          page: 1,
          pageSize: 20,
          totalItems: 1,
          totalPages: 1,
        }),
      },
    },
  },
  "/api/v1/admin/users/{userId}": {
    get: {
      tags,
      summary: "One account, with what goes with its role",
      description:
        "Customers: orderCount. Owners: restaurants [{ id, name, status }]. Riders: riderProfile { id, status }. canBeSuspended is false for admin accounts.",
      security: loggedIn,
      parameters: [userId],
      responses: {
        200: successResponse("The account", {
          ...exampleUser,
          orderCount: 23,
          canBeSuspended: true,
        }),
        404: errorResponse("No such user", "NOT_FOUND", "User not found"),
      },
    },
  },
  "/api/v1/admin/users/{userId}/suspend": {
    post: {
      tags,
      summary: "Suspend an account (not admins)",
      description:
        "Reason required. Signed out everywhere (refresh tokens revoked, live connections closed), riders taken offline, an SMS with the reason; audited as USER_SUSPENDED [AC-ADM-02, AC-ADM-08].",
      security: loggedIn,
      parameters: [userId],
      requestBody: jsonBody(userActionSchema, { reason: "Several fake orders placed" }),
      responses: {
        ...actionResponses,
        409: errorResponse(
          "Already suspended",
          "ALREADY_SUSPENDED",
          "This account is already suspended",
        ),
      },
    },
  },
  "/api/v1/admin/users/{userId}/reactivate": {
    post: {
      tags,
      summary: "Reactivate a suspended account",
      description:
        "Reason required. Back to the status it had before the suspension (from the audit log); an SMS; audited as USER_REACTIVATED.",
      security: loggedIn,
      parameters: [userId],
      requestBody: jsonBody(userActionSchema, { reason: "Checked with the customer" }),
      responses: {
        ...actionResponses,
        409: errorResponse("Not suspended", "NOT_SUSPENDED", "This account is not suspended"),
      },
    },
  },
};
