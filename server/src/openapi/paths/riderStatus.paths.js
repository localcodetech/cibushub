import { goOnlineSchema } from "../../validators/rider/riderPresence.validator.js";
import { errorResponse, jsonBody, successResponse } from "../helpers.js";

const tags = ["Rider: Online status"];
const loggedIn = [{ cookieAuth: [] }];

const exampleStatus = {
  applicationStatus: "APPROVED",
  isOnline: true,
  wentOnlineAt: "2026-10-10T12:00:00.000Z",
  lastLocationAt: "2026-10-10T12:04:55.000Z",
};

export const riderStatusPaths = {
  "/api/v1/rider/status": {
    get: {
      tags,
      summary: "Am I online?",
      security: loggedIn,
      responses: { 200: successResponse("My status", exampleStatus) },
    },
  },
  "/api/v1/rider/status/online": {
    post: {
      tags,
      summary: "Go online with my current location",
      description:
        "Approved riders only. After this, the phone sends its position every 5 to 10 seconds on the Socket.IO event rider:location ({ latitude, longitude, accuracyMetres? }), answered with { ok: true } or { ok: false, reason: TOO_FREQUENT | INVALID | IMPLAUSIBLE | OFFLINE }. Riders silent for 5 minutes are taken offline and get the socket event rider:status.",
      security: loggedIn,
      requestBody: jsonBody(goOnlineSchema, {
        latitude: 6.6885,
        longitude: -1.6244,
        accuracyMetres: 12,
      }),
      responses: {
        200: successResponse("Online", exampleStatus),
        400: errorResponse("No location sent", "VALIDATION_ERROR", "Location is required"),
        403: errorResponse(
          "Not an approved rider",
          "RIDER_NOT_APPROVED",
          "Only approved riders can go online",
        ),
      },
    },
  },
  "/api/v1/rider/status/offline": {
    post: {
      tags,
      summary: "Go offline",
      description: "No more offers; the live position is removed.",
      security: loggedIn,
      responses: {
        200: successResponse("Offline", { ...exampleStatus, isOnline: false, wentOnlineAt: null }),
      },
    },
  },
};
