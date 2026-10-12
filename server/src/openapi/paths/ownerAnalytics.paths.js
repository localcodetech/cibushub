import { errorResponse, queryParameters, successResponse } from "../helpers.js";
import { ownerAnalyticsSchema } from "../../validators/restaurant/ownerAnalytics.validator.js";

export const ownerAnalyticsPaths = {
  "/api/v1/owner/analytics": {
    get: {
      tags: ["Owner: Analytics"],
      summary: "One of my restaurants: orders, earnings, best sellers and ratings per day",
      description:
        "from and to are Ghana days, both included, at most 92 days. Orders count on the day they became PAID. earningsPesewas = the restaurant's share of DELIVERED orders. bestSellers: top 5 dishes by quantity, not counting rejected or cancelled orders. averageRating leaves out hidden reviews; null on days without reviews. Another owner's restaurant returns 404. Cached for 2 minutes. Rules: docs/analytics.md [AC-ANL-03].",
      security: [{ cookieAuth: [] }],
      parameters: queryParameters(ownerAnalyticsSchema),
      responses: {
        200: successResponse("The charts' data", {
          restaurant: { id: "1757f836-937d-4c2c-a944-fb593ac87e63", name: "Golden Pot" },
          from: "2026-10-08",
          to: "2026-10-09",
          totals: { orders: 5, earningsPesewas: 21600, reviews: 2, averageRating: 4.5 },
          days: [
            {
              day: "2026-10-08",
              orders: 2,
              earningsPesewas: 10800,
              reviews: 0,
              averageRating: null,
            },
            {
              day: "2026-10-09",
              orders: 3,
              earningsPesewas: 10800,
              reviews: 2,
              averageRating: 4.5,
            },
          ],
          bestSellers: [
            {
              menuItemId: "4c0a9a8e-1f43-4d61-9a55-0f3b1f0d6a11",
              name: "Waakye",
              quantity: 7,
              salesPesewas: 21000,
            },
          ],
        }),
        400: errorResponse(
          "Bad dates, or more than 92 days",
          "VALIDATION_ERROR",
          "Invalid request data",
        ),
        404: errorResponse("Not one of my restaurants", "NOT_FOUND", "Restaurant not found"),
      },
    },
  },
};
