import { placeSearchSchema, reverseGeocodeSchema } from "../../validators/maps/maps.validator.js";
import { errorResponse, queryParameters, successResponse } from "../helpers.js";

const tags = ["Customer: Maps"];
const loggedIn = [{ cookieAuth: [] }];

const validationError = errorResponse("Invalid input", "VALIDATION_ERROR", "Invalid request data");
const tooMany = errorResponse(
  "Over 30 lookups a minute",
  "RATE_LIMITED",
  "Too many attempts. Please try again later",
);

export const customerMapsPaths = {
  "/api/v1/customer/maps/reverse": {
    get: {
      tags,
      summary: "Map pin to area name",
      description:
        "Uses OpenStreetMap Nominatim, cached for 30 days per ~11 m. Never fails because of the geocoder: if it is down, area and displayName are null and the customer types the area.",
      security: loggedIn,
      parameters: queryParameters(reverseGeocodeSchema),
      responses: {
        200: successResponse("The area at this pin", {
          area: "Ayeduase",
          displayName: "Ayeduase, Oforikrom, Kumasi, Ashanti Region, Ghana",
        }),
        400: validationError,
        429: tooMany,
      },
    },
  },
  "/api/v1/customer/maps/search": {
    get: {
      tags,
      summary: "Search a place in Ghana (Kumasi first)",
      security: loggedIn,
      parameters: queryParameters(placeSearchSchema),
      responses: {
        200: successResponse("Up to 5 places", [
          {
            name: "Kejetia Market",
            area: "Adum",
            displayName: "Kejetia Market, Osei Tutu I Avenue, Adum, Kumasi, Ghana",
            latitude: 6.6958,
            longitude: -1.621,
          },
        ]),
        400: validationError,
        429: tooMany,
        503: errorResponse(
          "The geocoder is down",
          "MAPS_UNAVAILABLE",
          "Map search isn't working right now. Move the pin instead",
        ),
      },
    },
  },
};
