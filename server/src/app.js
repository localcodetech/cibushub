import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import env from "./config/env/env.js";
import pinoHttp from "pino-http";
import logger from "./config/logger.js";
import { randomUUID } from "node:crypto";
import notFound from "./middlewares/notFound.js";
import errorHandler from "./middlewares/errorHandler.js";
import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import publicRestaurantRoutes from "./routes/restaurant.routes.js";
import ownerRestaurantRoutes from "./routes/owner/restaurant.routes.js";
import ownerMenuRoutes from "./routes/owner/menu.routes.js";
import authenticate from "./middlewares/authenticate.js";
import authorize from "./middlewares/authorize.js";
import requireActive from "./middlewares/requireActive.js";
import adminRestaurantRoutes from "./routes/admin/restaurant.routes.js";
import customerAddressRoutes from "./routes/customer/address.routes.js";
import customerCheckoutRoutes from "./routes/customer/checkout.routes.js";
import customerOrderRoutes from "./routes/customer/order.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import cartRoutes from "./routes/cart.routes.js";
import { globalLimiter } from "./middlewares/rateLimit/globalLimiter.js";
import checkOrigin from "./middlewares/checkOrigin.js";
import swaggerUi from "swagger-ui-express";
import { openApiDocument } from "./openapi/document.js";

const app = express();

// ─────────────────────────────────────────────
// How many proxies (e.g. Caddy) sit in front of the API: 0 locally, 1 in production
// ─────────────────────────────────────────────
app.set("trust proxy", env.TRUST_PROXY);

// ─────────────────────────────────────────────
// Log every request on one line, with a unique request ID
// ─────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    genReqId: () => randomUUID(),
    serializers: {
      req: (req) => ({ id: req.id, method: req.method, url: req.url }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
    customLogLevel: (req, res, error) => {
      if (error || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
  }),
);

// ─────────────────────────────────────────────
// Security headers
// ─────────────────────────────────────────────
app.use(helmet());

// ─────────────────────────────────────────────
// Allow only the React app to call the API, with cookies
// ─────────────────────────────────────────────
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));

// ─────────────────────────────────────────────
// At most 100 requests per minute from one IP
// ─────────────────────────────────────────────
app.use(globalLimiter);

// ─────────────────────────────────────────────
// Block changes (POST, PUT, PATCH, DELETE) sent from other websites (CSRF)
// ─────────────────────────────────────────────
app.use(checkOrigin);

// ─────────────────────────────────────────────
// Read JSON request bodies (max 100 kb)
// ─────────────────────────────────────────────
app.use(express.json({ limit: "100kb" }));

// ─────────────────────────────────────────────
// Read cookies sent by the browser
// ─────────────────────────────────────────────
app.use(cookieParser());

// ─────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────
app.use("/api/health", healthRoutes);

// ─────────────────────────────────────────────
// Auth: register, verify phone, login, refresh, logout, passwords
// ─────────────────────────────────────────────
app.use("/api/v1/auth", authRoutes);

// ─────────────────────────────────────────────
// Public: browse, search and view restaurants (guests too)
// ─────────────────────────────────────────────
app.use("/api/v1/restaurants", publicRestaurantRoutes);

// ─────────────────────────────────────────────
// Cart check (guests too): the server is the source of truth for prices
// ─────────────────────────────────────────────
app.use("/api/v1/cart", cartRoutes);

// ─────────────────────────────────────────────
// My profile (any role): change name, upload photo
// ─────────────────────────────────────────────
app.use("/api/v1/profile", authenticate, requireActive, profileRoutes);

// ─────────────────────────────────────────────
// Every customer route: must be logged in as an active customer
// ─────────────────────────────────────────────
app.use("/api/v1/customer", authenticate, requireActive, authorize("CUSTOMER"));

// ─────────────────────────────────────────────
// Customer's saved delivery addresses
// ─────────────────────────────────────────────
app.use("/api/v1/customer/addresses", customerAddressRoutes);

// ─────────────────────────────────────────────
// Customer checkout: quote now, place order next
// ─────────────────────────────────────────────
app.use("/api/v1/customer/checkout", customerCheckoutRoutes);

// ─────────────────────────────────────────────
// Customer orders: place an order
// ─────────────────────────────────────────────
app.use("/api/v1/customer/orders", customerOrderRoutes);

// ─────────────────────────────────────────────
// Every owner route: must be logged in as a restaurant owner
// ─────────────────────────────────────────────
app.use("/api/v1/owner", authenticate, authorize("RESTAURANT_OWNER"));

// ─────────────────────────────────────────────
// Owner's restaurants: submit, list, edit, hours
// ─────────────────────────────────────────────
app.use("/api/v1/owner/restaurants", ownerRestaurantRoutes);

// ─────────────────────────────────────────────
// Owner's menus: categories, items, option groups, sold-out switches
// ─────────────────────────────────────────────
app.use("/api/v1/owner/restaurants/:restaurantId/menu", ownerMenuRoutes);

// ─────────────────────────────────────────────
// Every admin route: must be logged in as an active admin or super admin
// ─────────────────────────────────────────────
app.use("/api/v1/admin", authenticate, requireActive, authorize("ADMIN", "SUPER_ADMIN"));

// ─────────────────────────────────────────────
// Admin: approve, reject, suspend restaurants
// ─────────────────────────────────────────────
app.use("/api/v1/admin/restaurants", adminRestaurantRoutes);

// ─────────────────────────────────────────────
// Interactive API docs (turned off in production)
// ─────────────────────────────────────────────
if (env.NODE_ENV !== "production") {
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
}

// ─────────────────────────────────────────────
// Unknown routes → 404
// ─────────────────────────────────────────────
app.use(notFound);

// ─────────────────────────────────────────────
// Turn every error into the standard error response (must stay last)
// ─────────────────────────────────────────────
app.use(errorHandler);

export default app;
