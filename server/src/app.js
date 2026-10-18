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
import dishRoutes from "./routes/dish.routes.js";
import ownerRestaurantRoutes from "./routes/owner/restaurant.routes.js";
import ownerReviewRoutes from "./routes/owner/review.routes.js";
import ownerOrderRoutes from "./routes/owner/order.routes.js";
import ownerMenuRoutes from "./routes/owner/menu.routes.js";
import ownerAnalyticsRoutes from "./routes/owner/analytics.routes.js";
import authenticate from "./middlewares/authenticate.js";
import authorize from "./middlewares/authorize.js";
import requireActive from "./middlewares/requireActive.js";
import adminRestaurantRoutes from "./routes/admin/restaurant.routes.js";
import adminOrderRoutes from "./routes/admin/order.routes.js";
import riderApplicationRoutes from "./routes/rider/application.routes.js";
import adminRiderRoutes from "./routes/admin/rider.routes.js";
import adminNotificationRoutes from "./routes/admin/notification.routes.js";
import adminReviewRoutes from "./routes/admin/review.routes.js";
import adminDashboardRoutes from "./routes/admin/dashboard.routes.js";
import adminAnalyticsRoutes from "./routes/admin/analytics.routes.js";
import adminExportRoutes from "./routes/admin/export.routes.js";
import adminPaymentRoutes from "./routes/admin/payment.routes.js";
import adminUserRoutes from "./routes/admin/user.routes.js";
import adminAuditLogRoutes from "./routes/admin/auditLog.routes.js";
import superAdminAdminRoutes from "./routes/superAdmin/admin.routes.js";
import superAdminSettingsRoutes from "./routes/superAdmin/settings.routes.js";
import queueDashboard, { QUEUE_DASHBOARD_PATH } from "./routes/superAdmin/queues.routes.js";
import riderStatusRoutes from "./routes/rider/status.routes.js";
import riderOfferRoutes from "./routes/rider/offer.routes.js";
import riderDeliveryRoutes from "./routes/rider/delivery.routes.js";
import riderEarningsRoutes from "./routes/rider/earnings.routes.js";
import customerAddressRoutes from "./routes/customer/address.routes.js";
import customerMapsRoutes from "./routes/customer/maps.routes.js";
import customerCheckoutRoutes from "./routes/customer/checkout.routes.js";
import customerOrderRoutes from "./routes/customer/order.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import cartRoutes from "./routes/cart.routes.js";
import webhookRoutes from "./routes/webhook.routes.js";
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
// Read cookies sent by the browser (first, so the limit below knows who's logged in)
// ─────────────────────────────────────────────
app.use(cookieParser());

// ─────────────────────────────────────────────
// At most 200 requests a minute per logged-in account, 100 per IP for guests
// ─────────────────────────────────────────────
app.use(globalLimiter);

// ─────────────────────────────────────────────
// Block changes (POST, PUT, PATCH, DELETE) sent from other websites (CSRF)
// ─────────────────────────────────────────────
app.use(checkOrigin);

// ─────────────────────────────────────────────
// Webhooks (Paystack payments, Resend emails): BEFORE the JSON reader, because the signature
// is checked on the raw bytes
// ─────────────────────────────────────────────
app.use("/api/v1/webhooks", webhookRoutes);

// ─────────────────────────────────────────────
// Read JSON request bodies (max 100 kb)
// ─────────────────────────────────────────────
app.use(express.json({ limit: "100kb" }));

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
// Public: dish search across restaurants, e.g. every jollof in Kumasi (guests too)
// ─────────────────────────────────────────────
app.use("/api/v1/dishes", dishRoutes);

// ─────────────────────────────────────────────
// Cart check (guests too): the server is the source of truth for prices
// ─────────────────────────────────────────────
app.use("/api/v1/cart", cartRoutes);

// ─────────────────────────────────────────────
// My profile (any role): change name, upload photo
// ─────────────────────────────────────────────
app.use("/api/v1/profile", authenticate, requireActive, profileRoutes);

// ─────────────────────────────────────────────
// My in-app notifications (any role, even while waiting for approval:
// a rider still needs to read "your application was not approved")
// ─────────────────────────────────────────────
app.use("/api/v1/notifications", authenticate, notificationRoutes);

// ─────────────────────────────────────────────
// Every customer route: must be logged in as an active customer
// ─────────────────────────────────────────────
app.use("/api/v1/customer", authenticate, requireActive, authorize("CUSTOMER"));

// ─────────────────────────────────────────────
// Customer's saved delivery addresses
// ─────────────────────────────────────────────
app.use("/api/v1/customer/addresses", customerAddressRoutes);

// ─────────────────────────────────────────────
// Customer map lookups for the address form: pin -> area, place search
// ─────────────────────────────────────────────
app.use("/api/v1/customer/maps", customerMapsRoutes);

// ─────────────────────────────────────────────
// Customer checkout: quote now, place order next
// ─────────────────────────────────────────────
app.use("/api/v1/customer/checkout", customerCheckoutRoutes);

// ─────────────────────────────────────────────
// Customer orders: place, list, view, cancel
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
// Owner: the same place search and pin lookup customers use, for placing the restaurant's pin
// (open to owners still waiting for approval: they set up their first restaurant)
// ─────────────────────────────────────────────
app.use("/api/v1/owner/maps", customerMapsRoutes);

// ─────────────────────────────────────────────
// Owner's orders: board, accept or reject, preparing, ready, history, daily summary
// ─────────────────────────────────────────────
app.use("/api/v1/owner/orders", ownerOrderRoutes);

// ─────────────────────────────────────────────
// Owner's reviews: read them, reply once to each
// ─────────────────────────────────────────────
app.use("/api/v1/owner/reviews", ownerReviewRoutes);

// ─────────────────────────────────────────────
// Owner: analytics for one of my restaurants
// ─────────────────────────────────────────────
app.use("/api/v1/owner/analytics", ownerAnalyticsRoutes);

// ─────────────────────────────────────────────
// Every rider route: must be logged in as a rider
// ─────────────────────────────────────────────
app.use("/api/v1/rider", authenticate, authorize("RIDER"));

// ─────────────────────────────────────────────
// Rider application: vehicle, Ghana Card, photo, documents, submit for review
// ─────────────────────────────────────────────
app.use("/api/v1/rider/application", riderApplicationRoutes);

// ─────────────────────────────────────────────
// Rider online / offline (live location arrives over the socket)
// ─────────────────────────────────────────────
app.use("/api/v1/rider/status", riderStatusRoutes);

// ─────────────────────────────────────────────
// Delivery offers: the one waiting for me, accept, decline
// ─────────────────────────────────────────────
app.use("/api/v1/rider/offers", riderOfferRoutes);

// ─────────────────────────────────────────────
// My delivery: pickup, drop-off, code, unreachable, give it back before pickup
// ─────────────────────────────────────────────
app.use("/api/v1/rider/deliveries", riderDeliveryRoutes);

// ─────────────────────────────────────────────
// My earnings: completed deliveries per day, week, month
// ─────────────────────────────────────────────
app.use("/api/v1/rider/earnings", riderEarningsRoutes);

// ─────────────────────────────────────────────
// Every admin route: must be logged in as an active admin or super admin
// ─────────────────────────────────────────────
app.use("/api/v1/admin", authenticate, requireActive, authorize("ADMIN", "SUPER_ADMIN"));

// ─────────────────────────────────────────────
// Admin: the dashboard overview
// ─────────────────────────────────────────────
app.use("/api/v1/admin/dashboard", adminDashboardRoutes);

// ─────────────────────────────────────────────
// Admin: analytics charts (orders, money, statuses, top restaurants)
// ─────────────────────────────────────────────
app.use("/api/v1/admin/analytics", adminAnalyticsRoutes);

// ─────────────────────────────────────────────
// Admin: CSV exports (orders, payments) for a range of days
// ─────────────────────────────────────────────
app.use("/api/v1/admin/exports", adminExportRoutes);

// ─────────────────────────────────────────────
// Admin: user accounts (search, suspend, reactivate)
// ─────────────────────────────────────────────
app.use("/api/v1/admin/users", adminUserRoutes);

// ─────────────────────────────────────────────
// Admin: the audit log (read-only)
// ─────────────────────────────────────────────
app.use("/api/v1/admin/audit-logs", adminAuditLogRoutes);

// ─────────────────────────────────────────────
// Every super admin route: must be logged in as an active super admin [AC-SADM-01]
// ─────────────────────────────────────────────
app.use("/api/v1/super-admin", authenticate, requireActive, authorize("SUPER_ADMIN"));

// ─────────────────────────────────────────────
// Super admin: admin accounts (create, suspend, reactivate, change role, remove)
// ─────────────────────────────────────────────
app.use("/api/v1/super-admin/admins", superAdminAdminRoutes);

// ─────────────────────────────────────────────
// Super admin: platform settings (fees, commission, timeouts), versioned
// ─────────────────────────────────────────────
app.use("/api/v1/super-admin/settings", superAdminSettingsRoutes);

// ─────────────────────────────────────────────
// Super admin: the queue dashboard (Bull Board, read-only) [AC-JOB-05]
// ─────────────────────────────────────────────
app.use(QUEUE_DASHBOARD_PATH, queueDashboard);

// ─────────────────────────────────────────────
// Admin: payments and refunds (re-verify a payment, retry a failed refund)
// ─────────────────────────────────────────────
app.use("/api/v1/admin", adminPaymentRoutes);

// ─────────────────────────────────────────────
// Admin: approve, reject, suspend restaurants
// ─────────────────────────────────────────────
app.use("/api/v1/admin/restaurants", adminRestaurantRoutes);

// ─────────────────────────────────────────────
// Admin: cancel orders with a refund choice; assign, replace or remove the rider
// ─────────────────────────────────────────────
app.use("/api/v1/admin/orders", adminOrderRoutes);

// ─────────────────────────────────────────────
// Admin: review rider applications, approve, reject, suspend
// ─────────────────────────────────────────────
app.use("/api/v1/admin/riders", adminRiderRoutes);

// ─────────────────────────────────────────────
// Admin: every email and SMS sent, and which ones failed
// ─────────────────────────────────────────────
app.use("/api/v1/admin/notifications", adminNotificationRoutes);

// ─────────────────────────────────────────────
// Admin: review moderation (hide or show, with a reason)
// ─────────────────────────────────────────────
app.use("/api/v1/admin/reviews", adminReviewRoutes);

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
