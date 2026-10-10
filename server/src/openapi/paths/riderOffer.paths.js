import { errorResponse, pathParameter, successResponse } from "../helpers.js";

const tags = ["Rider: Offers"];
const loggedIn = [{ cookieAuth: [] }];

// What a rider sees before deciding [AC-ASSIGN-03]: never the customer's name or phone
const exampleOffer = {
  offerId: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d",
  deliveryId: "6f5e4d3c-2b1a-4c9d-8e7f-6a5b4c3d2e1f",
  restaurantName: "Auntie Akos Kitchen",
  restaurantArea: "Adum",
  pickupDistanceMetres: 950,
  dropoffArea: "Asokwa",
  deliveryDistanceMetres: 2400,
  earningsPesewas: 1500,
  offeredAt: "2026-10-10T12:00:05.000Z",
  expiresAt: "2026-10-10T12:01:05.000Z",
};

export const riderOfferPaths = {
  "/api/v1/rider/offers/current": {
    get: {
      tags,
      summary: "The offer waiting for me, or null",
      description:
        "Offers normally arrive live on the Socket.IO event delivery:offer (same shape). The app asks here after reconnecting. Each offer is open for 60 seconds.",
      security: loggedIn,
      responses: { 200: successResponse("The open offer, or null", exampleOffer) },
    },
  },
  "/api/v1/rider/offers/{offerId}/accept": {
    post: {
      tags,
      summary: "Accept an offer",
      description:
        "Exactly one rider wins a delivery, even if several accept at once. My other waiting offers close. If the food is already ready, the order becomes RIDER_ASSIGNED now; otherwise when the restaurant marks it ready.",
      security: loggedIn,
      parameters: [pathParameter("offerId", "One of my offers")],
      responses: {
        200: successResponse("The delivery is mine", {
          deliveryId: exampleOffer.deliveryId,
          orderId: "0f1e2d3c-4b5a-4968-8776-655443322110",
        }),
        404: errorResponse("Not my offer", "NOT_FOUND", "Offer not found"),
        409: errorResponse(
          "Taken by another rider (also OFFER_CLOSED, RIDER_BUSY, RIDER_NOT_AVAILABLE)",
          "DELIVERY_TAKEN",
          "This delivery has already been taken",
        ),
      },
    },
  },
  "/api/v1/rider/offers/{offerId}/decline": {
    post: {
      tags,
      summary: "Decline an offer",
      description:
        "The next nearest rider is asked straight away; I am never asked again for this delivery.",
      security: loggedIn,
      parameters: [pathParameter("offerId", "One of my offers")],
      responses: {
        200: successResponse("Declined", { declined: true }),
        404: errorResponse("Not my offer", "NOT_FOUND", "Offer not found"),
        409: errorResponse(
          "Expired or already answered",
          "OFFER_CLOSED",
          "This offer is no longer open",
        ),
      },
    },
  },
};
