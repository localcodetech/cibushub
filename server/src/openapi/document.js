import pkg from "../../package.json" with { type: "json" };
import { authPaths } from "./paths/auth.paths.js";
import { restaurantPaths } from "./paths/restaurant.paths.js";
import { ownerRestaurantPaths } from "./paths/ownerRestaurant.paths.js";
import { ownerMenuPaths } from "./paths/ownerMenu.paths.js";
import { adminRestaurantPaths } from "./paths/adminRestaurant.paths.js";
import { customerAddressPaths } from "./paths/customerAddress.paths.js";
import { customerMapsPaths } from "./paths/customerMaps.paths.js";
import { profilePaths } from "./paths/profile.paths.js";
import { cartPaths } from "./paths/cart.paths.js";
import { checkoutPaths } from "./paths/checkout.paths.js";
import { customerOrderListOperation, customerOrderPaths } from "./paths/customerOrder.paths.js";
import { webhookPaths } from "./paths/webhook.paths.js";
import { adminOrderPaths } from "./paths/adminOrder.paths.js";
import { successResponse, errorResponse } from "./helpers.js";

export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "CibusHub API",
    version: pkg.version,
    description:
      "Food ordering and delivery API. Login uses HttpOnly cookies: call /api/v1/auth/login first, and the browser sends the cookies automatically.",
  },
  servers: [{ url: "/" }],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "access_token",
      },
    },
  },
  paths: {
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "Check the API, MySQL and Redis",
        responses: {
          200: successResponse("Everything is up", {
            status: "ok",
            version: pkg.version,
            uptime: 42,
            services: { mysql: "up", redis: "up" },
          }),
          503: errorResponse(
            "MySQL or Redis is down",
            "SERVICE_UNAVAILABLE",
            "One or more services are unavailable",
          ),
        },
      },
    },
    ...authPaths,
    ...restaurantPaths,
    ...ownerRestaurantPaths,
    ...ownerMenuPaths,
    ...adminRestaurantPaths,
    ...customerAddressPaths,
    ...customerMapsPaths,
    ...profilePaths,
    ...cartPaths,
    ...checkoutPaths,
    // GET (my orders) and POST (place order) share one URL, so the two are joined here
    "/api/v1/customer/orders": {
      ...checkoutPaths["/api/v1/customer/orders"],
      get: customerOrderListOperation,
    },
    ...customerOrderPaths,
    ...webhookPaths,
    ...adminOrderPaths,
  },
};
