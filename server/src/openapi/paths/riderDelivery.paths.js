import { unassignRiderSchema } from "../../validators/order/manualAssignment.validator.js";
import { errorResponse, jsonBody, successResponse } from "../helpers.js";

const tags = ["Rider: Deliveries"];
const loggedIn = [{ cookieAuth: [] }];

export const riderDeliveryPaths = {
  "/api/v1/rider/deliveries/current/unassign": {
    post: {
      tags,
      summary: "Give my delivery back (I can't continue)",
      description:
        "Before pickup only, e.g. a breakdown. A new rider is searched for; I am not asked again for it.",
      security: loggedIn,
      requestBody: jsonBody(unassignRiderSchema, { reason: "My motorbike broke down" }),
      responses: {
        200: successResponse("Given back", {
          orderId: "0f1e2d3c-4b5a-4968-8776-655443322110",
          released: true,
        }),
        404: errorResponse("No delivery in hand", "NOT_FOUND", "You have no delivery in hand"),
        409: errorResponse(
          "Already picked up",
          "DELIVERY_ALREADY_PICKED_UP",
          "The food has already been picked up; the rider can't be changed now",
        ),
      },
    },
  },
};
