import { unassignRiderSchema } from "../../validators/order/manualAssignment.validator.js";
import {
  completeDeliverySchema,
  pickupSchema,
  doorProblemSchema,
  returnedSchema,
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
  canReportProblem: true,
  callsNeededFirst: 2,
  problem: null,
  returnPayoutPesewas: null,
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
        "After pickup. The tap is counted (the proof of calling for a door-problem report), then the app dials the returned number.",
      security: loggedIn,
      responses: {
        200: successResponse("Counted", { phone: "+233551234561", callAttempts: 1 }),
        409: errorResponse("Not picked up yet", "NOT_PICKED_UP", "Confirm pickup first"),
      },
    },
  },
  "/api/v1/rider/deliveries/current/problem": {
    post: {
      tags,
      summary: "A problem at the door: unreachable, not at the address, or won't give the code",
      description:
        "Within 300 m of the drop-off pin. UNREACHABLE and NOT_AT_ADDRESS need 2 counted calls first. A 10-minute wait starts (problem.waitEndsAt); the customer's app is told and admins are alerted with the rider's location. The code still works during the wait. If nobody acts, the order is cancelled with no refund and the delivery becomes RETURNING: take the food back to the restaurant (1.5x pay).",
      security: loggedIn,
      requestBody: jsonBody(doorProblemSchema, {
        problemType: "UNREACHABLE",
        note: "Blue gate locked, nobody answers",
      }),
      responses: {
        200: successResponse("Reported: wait until problem.waitEndsAt", {
          ...exampleDelivery,
          callAttempts: 2,
          canReportProblem: false,
          problem: {
            type: "UNREACHABLE",
            reportedAt: "2026-10-11T12:50:00.000Z",
            waitEndsAt: "2026-10-11T13:00:00.000Z",
          },
        }),
        409: errorResponse(
          "Not enough calls, too far from the drop-off, or already reported",
          "NOT_AT_DROPOFF",
          "You are about 850 m from the drop-off. Go to the customer's pin first.",
        ),
      },
    },
  },
  "/api/v1/rider/deliveries/current/returned": {
    post: {
      tags,
      summary: "Food returned to the restaurant",
      description:
        "Only while the delivery is RETURNING. More than 200 m from the restaurant: 409 with the distance; send confirmFarAway: true to go ahead (flagged for admins). The rider is free and earns 1.5x the delivery's rider earnings.",
      security: loggedIn,
      requestBody: jsonBody(returnedSchema, { confirmFarAway: false }),
      responses: {
        200: successResponse("Returned", {
          orderId: ORDER_ID,
          returned: true,
          earnedPesewas: 2154,
        }),
        409: errorResponse(
          "Not returning, or too far from the restaurant",
          "RETURN_FAR_FROM_RESTAURANT",
          "You are about 850 m from the restaurant. Confirm only if you gave the food back.",
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
