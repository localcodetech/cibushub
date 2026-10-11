import {
  adminActionSchema,
  changeAdminRoleSchema,
  createAdminSchema,
} from "../../validators/superAdmin/manageAdmins.validator.js";
import { errorResponse, jsonBody, pathParameter, successResponse } from "../helpers.js";

const tags = ["Super admin: Admins"];
const loggedIn = [{ cookieAuth: [] }];
const userId = pathParameter("userId", "An admin or super admin account (not your own)");

const exampleAdmin = {
  id: "7c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f",
  fullName: "Esi Admin",
  email: "esi@example.com",
  phone: "+233552223333",
  role: "ADMIN",
  status: "ACTIVE",
  lastLoginAt: null,
};

const common = {
  400: errorResponse("Bad input or no reason", "VALIDATION_ERROR", "Invalid request data"),
  403: errorResponse(
    "Your own account",
    "OWN_ACCOUNT",
    "You can't change your own admin account here",
  ),
  404: errorResponse("Not an admin", "NOT_FOUND", "Admin not found"),
  409: errorResponse(
    "Would leave no active super admin [AC-SADM-04]",
    "LAST_SUPER_ADMIN",
    "This is the last active super admin. Make someone else a super admin first",
  ),
};

const action = (summary, description, body) => ({
  tags,
  summary,
  description,
  security: loggedIn,
  parameters: [userId],
  requestBody: jsonBody(body.schema, body.example),
  responses: { 200: successResponse("Done", exampleAdmin), ...common },
});

export const superAdminPaths = {
  "/api/v1/super-admin/admins": {
    get: {
      tags,
      summary: "Every admin and super admin",
      security: loggedIn,
      responses: { 200: successResponse("Admin accounts", [exampleAdmin]) },
    },
    post: {
      tags,
      summary: "Create an admin or super admin account",
      description:
        "Super admins only [AC-SADM-01]. Active at once with the given first password (handed over in person, never sent). Audited as ADMIN_CREATED.",
      security: loggedIn,
      requestBody: jsonBody(createAdminSchema, {
        fullName: "Esi Admin",
        email: "esi@example.com",
        phone: "055 222 3333",
        password: "Strong2026!",
        role: "ADMIN",
      }),
      responses: {
        201: successResponse("Created", exampleAdmin),
        409: errorResponse(
          "Email or phone taken",
          "ACCOUNT_EXISTS",
          "An account with these details already exists",
        ),
      },
    },
  },
  "/api/v1/super-admin/admins/{userId}/suspend": {
    post: action("Suspend an admin", "Signed out everywhere. Audited as ADMIN_SUSPENDED.", {
      schema: adminActionSchema,
      example: { reason: "Left the company today" },
    }),
  },
  "/api/v1/super-admin/admins/{userId}/reactivate": {
    post: action("Reactivate an admin", "Audited as ADMIN_REACTIVATED.", {
      schema: adminActionSchema,
      example: { reason: "Back from leave this week" },
    }),
  },
  "/api/v1/super-admin/admins/{userId}/role": {
    patch: action(
      "Make an admin a super admin, or the other way round",
      "They are signed out so their next login carries the new role. Audited as ADMIN_ROLE_CHANGED.",
      {
        schema: changeAdminRoleSchema,
        example: { role: "SUPER_ADMIN", reason: "Now runs operations" },
      },
    ),
  },
  "/api/v1/super-admin/admins/{userId}/remove": {
    post: action(
      "Remove an admin account",
      "Closed for good (kept in the database for the audit history). Audited as ADMIN_REMOVED.",
      { schema: adminActionSchema, example: { reason: "Account no longer needed" } },
    ),
  },
};
