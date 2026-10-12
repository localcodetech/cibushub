import { successResponse } from "../helpers.js";

export const adminDashboardPaths = {
  "/api/v1/admin/dashboard": {
    get: {
      tags: ["Admin: Dashboard"],
      summary: "Today's orders and GMV, active orders, riders online, approvals and alerts",
      description:
        "today: from midnight Ghana time (UTC); paidOrders and gmvPesewas count orders that became PAID today (GMV is before refunds). alerts: orders searching for a rider 10+ minutes, AMOUNT_MISMATCH payments, payments PENDING 30+ minutes, FAILED refunds, emails/SMS FAILED in the last 24 hours [AC-ADM-01].",
      security: [{ cookieAuth: [] }],
      responses: {
        200: successResponse("The overview", {
          today: { from: "2026-10-11T00:00:00.000Z", paidOrders: 3, gmvPesewas: 27678 },
          activeOrders: {
            PAID: 0,
            ACCEPTED: 0,
            PREPARING: 0,
            READY_FOR_PICKUP: 6,
            RIDER_ASSIGNED: 0,
            PICKED_UP: 2,
          },
          onlineRiders: 2,
          pendingApprovals: { restaurants: 1, riders: 1 },
          alerts: {
            ordersWithoutRider: 2,
            amountMismatches: 0,
            stuckPayments: 0,
            failedRefunds: 0,
            failedMessages: 0,
          },
        }),
      },
    },
  },
};
