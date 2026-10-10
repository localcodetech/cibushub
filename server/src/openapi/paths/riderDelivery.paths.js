import { unassignRiderSchema } from "../../validators/order/manualAssignment.validator.js";
import {
  completeDeliverySchema,
  pickupSchema,
  unreachableSchema,
} from "../../validators/order/deliveryFlow.validator.js";
import { errorResponse, jsonBody, successResponse } from "../helpers.js";

const tags = ["Rider: Deliveries"];
const loggedIn = [{ cookieAuth: [] }];

const ORDER_ID = "0f1e2d3c-4b5a-4968-8776-655443322110";

const exampleDelivery = {
  deliveryId: "7a6b5c4d-3e2f-4a1b-9c8d-7e6f5a4b3c2d",
  orderId: ORDER_ID,
  orderNumber: "CH-261010-126142",
  status: "PICKED_UP",
  foodReady: true,
  earningsPesewas: 1200,
  assignedAt: "2026-10-10T12:20:00.000Z",
  pickedUpAt: "2026-10-10T12:41:00.000Z",
  items: [{ name: "Waakye", quantity: 2 }],
  pickup: {
    restaurantName: "Auntie Esi's Kitchen",
    phone: "+233201112221",
    addressLine: "Kejetia Road",
    area: "Adum",
    latitude: 6.6885,
    longitude: -1.6244,
  },
  dropoff: {
    area: "Bantama",
    customerFirstName: "Ama",
    latitude: 6.7045,
    longitude: -1.6155,
    ghanaPostGps: "AK-039-5028",
    landmark: "Blue gate opposite the pharmacy",
    instructions: "Call when you reach the gate",
    phone: "+233551234561",
  },
  codeAttemptsLeft: 5,
  callAttempts: 0,
  canReportUnreachable: false,
  unreachableReportedAt: null,
};

export const riderDeliveryPaths = {
  "/api/v1/rider/deliveries/current": {
    get: {
      tags,
      summary: "My delivery in hand (null when none)",
      description:
        "Before pickup: the restaurant (with a map pin for Google Maps) and only the drop-off area. After pickup: the customer's first name, pin, Ghana Post GPS, landmark, instructions and phone. Nothing once delivered.",
      security: loggedIn,
      responses: {
        200: successResponse("The delivery, or null", exampleDelivery),
      },
    },
  },
  "/api/v1/rider/deliveries/current/pickup": {
    post: {
      tags,
      summary: "Picked up",
      description:
        "Only once the restaurant marked the food ready. More than 200 m from the restaurant (or no known location): 409 with the distance; send confirmFarAway: true to go ahead, and the pickup is flagged for admins.",
      security: loggedIn,
      requestBody: jsonBody(pickupSchema, { confirmFarAway: false }),
      responses: {
        200: successResponse("Picked up: drop-off details now included", exampleDelivery),
        404: errorResponse("No delivery in hand", "NOT_FOUND", "You have no delivery in hand"),
        409: errorResponse(
          "Too far, not ready, or already picked up",
          "PICKUP_FAR_FROM_RESTAURANT",
          "You are about 850 m from the restaurant. Confirm only if you have the food.",
        ),
      },
    },
  },
  "/api/v1/rider/deliveries/current/complete": {
    post: {
      tags,
      summary: "Delivered, with the customer's 4-digit code",
      description:
        "The customer sees the code in their app once the food is picked up. 5 wrong codes lock it and admins are alerted.",
      security: loggedIn,
      requestBody: jsonBody(completeDeliverySchema, { code: "4821" }),
      responses: {
        200: successResponse("Delivered", { orderId: ORDER_ID, delivered: true }),
        400: errorResponse("Wrong code", "WRONG_DELIVERY_CODE", "Wrong code. 4 attempt(s) left."),
        409: errorResponse("Not picked up yet", "NOT_PICKED_UP", "Confirm pickup first"),
        429: errorResponse(
          "Code locked",
          "DELIVERY_CODE_LOCKED",
          "Too many wrong codes. CibusHub support has been told and will contact you.",
        ),
      },
    },
  },
  "/api/v1/rider/deliveries/current/call": {
    post: {
      tags,
      summary: "Call the customer (counted)",
      description:
        "After pickup. The tap is counted (the proof of calling for an unreachable report), then the app dials the returned number.",
      security: loggedIn,
      responses: {
        200: successResponse("Counted", { phone: "+233551234561", callAttempts: 1 }),
        409: errorResponse("Not picked up yet", "NOT_PICKED_UP", "Confirm pickup first"),
      },
    },
  },
  "/api/v1/rider/deliveries/current/unreachable": {
    post: {
      tags,
      summary: "Customer unreachable",
      description:
        "After at least 2 counted calls. Admins are alerted with the rider's location and call count; the customer's app is told. The rider keeps the food: the code still works if the customer turns up, otherwise an admin cancels (delivery FAILED) and chooses the refund.",
      security: loggedIn,
      requestBody: jsonBody(unreachableSchema, { note: "Blue gate locked, nobody answers" }),
      responses: {
        200: successResponse("Reported", { ...exampleDelivery, callAttempts: 2 }),
        409: errorResponse(
          "Not enough calls, or already reported",
          "CALL_THE_CUSTOMER_FIRST",
          "Call the customer at least 2 times first",
        ),
      },
    },
  },
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
          orderId: ORDER_ID,
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
