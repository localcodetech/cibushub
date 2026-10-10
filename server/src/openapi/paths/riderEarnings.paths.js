import { riderEarningsSchema } from "../../validators/rider/riderEarnings.validator.js";
import { queryParameters, successResponse } from "../helpers.js";

export const riderEarningsPaths = {
  "/api/v1/rider/earnings": {
    get: {
      tags: ["Rider: Earnings"],
      summary: "My completed deliveries and earnings for a day, week or month",
      description:
        "The day, week (Monday to Sunday) or month containing `date` (today when left out), in Ghana time. Only DELIVERED orders count. The summary covers all pages; the list is newest first and never includes the customer's name, phone or exact address.",
      security: [{ cookieAuth: [] }],
      parameters: queryParameters(riderEarningsSchema),
      responses: {
        200: {
          ...successResponse("Totals and the page of deliveries", {
            summary: {
              period: "week",
              from: "2026-10-05T00:00:00.000Z",
              to: "2026-10-12T00:00:00.000Z",
              deliveryCount: 2,
              earningsPesewas: 2400,
            },
            deliveries: [
              {
                deliveryId: "7a6b5c4d-3e2f-4a1b-9c8d-7e6f5a4b3c2d",
                orderNumber: "CH-261010-126142",
                restaurantName: "Auntie Esi's Kitchen",
                restaurantArea: "Adum",
                dropoffArea: "Bantama",
                distanceMetres: 2100,
                pickedUpAt: "2026-10-10T12:20:00.000Z",
                deliveredAt: "2026-10-10T12:41:00.000Z",
                earningsPesewas: 1200,
              },
            ],
          }),
        },
      },
    },
  },
};
