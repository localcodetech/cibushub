import { errorResponse, queryParameters, successResponse } from "../helpers.js";
import { analyticsRangeSchema } from "../../validators/admin/analytics.validator.js";

export const adminAnalyticsPaths = {
  "/api/v1/admin/analytics": {
    get: {
      tags: ["Admin: Analytics"],
      summary: "Orders and money per day, orders by status, top restaurants",
      description:
        "from and to are Ghana days, both included, at most 92 days. An order counts on the day it became PAID. customerPaidPesewas = order totals minus processed refunds. cibushubPesewas = commission + service fee of DELIVERED orders. ordersByStatus counts orders PLACED in the range by their current status (unpaid ones too). Cached for 2 minutes. Rules: docs/analytics.md [AC-ANL-01, AC-ANL-05, AC-ANL-06].",
      security: [{ cookieAuth: [] }],
      parameters: queryParameters(analyticsRangeSchema),
      responses: {
        200: successResponse("The charts' data", {
          from: "2026-10-08",
          to: "2026-10-09",
          totals: { orders: 3, customerPaidPesewas: 21000, cibushubPesewas: 1200 },
          days: [
            { day: "2026-10-08", orders: 1, customerPaidPesewas: 7000, cibushubPesewas: 600 },
            { day: "2026-10-09", orders: 2, customerPaidPesewas: 14000, cibushubPesewas: 600 },
          ],
          ordersByStatus: { PENDING_PAYMENT: 1, PAID: 0, DELIVERED: 2, CANCELLED: 1 },
          topRestaurants: [
            {
              restaurantId: "1757f836-937d-4c2c-a944-fb593ac87e63",
              name: "Golden Pot",
              orders: 3,
              customerPaidPesewas: 21000,
            },
          ],
        }),
        400: errorResponse(
          "Bad dates, or more than 92 days",
          "VALIDATION_ERROR",
          "Invalid request data",
        ),
      },
    },
  },
};
