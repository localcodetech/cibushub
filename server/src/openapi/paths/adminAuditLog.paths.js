import { listAuditLogsSchema } from "../../validators/admin/auditLogs.validator.js";
import { listResponse, queryParameters, successResponse } from "../helpers.js";

const tags = ["Admin: Audit log"];
const loggedIn = [{ cookieAuth: [] }];

export const adminAuditLogPaths = {
  "/api/v1/admin/audit-logs": {
    get: {
      tags,
      summary: "Every admin action, newest first (read-only)",
      description:
        "Who (actor), what (action), on what (targetType, targetId), before and after values, reason, IP and time. Filters: action, targetType, targetId, actorId, from/to days in Ghana time [AC-ADM-07].",
      security: loggedIn,
      parameters: queryParameters(listAuditLogsSchema),
      responses: {
        200: listResponse(
          "One page of the log",
          {
            id: "2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e6f",
            action: "USER_SUSPENDED",
            targetType: "user",
            targetId: "9a8b7c6d-5e4f-4321-8765-0fedcba98765",
            before: { status: "ACTIVE" },
            after: { status: "SUSPENDED" },
            reason: "Several fake orders placed",
            ipAddress: "102.176.0.12",
            createdAt: "2026-10-11T12:00:00.000Z",
            actor: {
              id: "7c1d2e3f-4a5b-4c6d-8e9f-0a1b2c3d4e5f",
              fullName: "Ada Admin",
              role: "ADMIN",
            },
          },
          { page: 1, pageSize: 20, totalItems: 1, totalPages: 1 },
        ),
      },
    },
  },
  "/api/v1/admin/audit-logs/actions": {
    get: {
      tags,
      summary: "The action names used so far (for the filter)",
      security: loggedIn,
      responses: {
        200: successResponse("Action names, A to Z", ["ORDER_CANCELLED", "USER_SUSPENDED"]),
      },
    },
  },
};
