import { api, downloadFile } from "@/lib/api";

// Every call to the /admin endpoints lives here (admins and super admins only).

// Today's paid orders and GMV, active orders by status, riders online,
// approvals waiting and alerts [AC-ADM-01]
export const getAdminDashboardRequest = async () => {
  const result = await api.get("/admin/dashboard");
  return result.data;
};

// kind: "orders" or "payments"; saves a CSV file of that range [AC-ANL-04]
export const downloadExportRequest = (kind, { from, to }) => {
  return downloadFile(
    "/admin/exports/" + kind + "?" + new URLSearchParams({ from, to }),
    "cibushub-" + kind + "-" + from + "-to-" + to + ".csv",
  );
};

// from, to: Ghana days like "2026-10-01", both included [AC-ANL-01]
export const getAdminAnalyticsRequest = async ({ from, to }) => {
  const result = await api.get("/admin/analytics?" + new URLSearchParams({ from, to }));
  return result.data;
};

// ─────────────────────────────────────────────
// Restaurants [AC-ADM-03]
// ─────────────────────────────────────────────

// filters = { status (e.g. "PENDING_APPROVAL"), q (part of the name), page }
// Returns { restaurants, meta }. Oldest first: the review queue.
export const getAdminRestaurantsRequest = async (filters) => {
  const query = new URLSearchParams({ page: String(filters.page) });
  if (filters.status) {
    query.set("status", filters.status);
  }
  if (filters.q) {
    query.set("q", filters.q);
  }
  const result = await api.get("/admin/restaurants?" + query.toString());
  return { restaurants: result.data, meta: result.meta };
};

// One restaurant, with its owner's contact and the last 30 days' performance
export const getAdminRestaurantRequest = async (restaurantId) => {
  const result = await api.get("/admin/restaurants/" + restaurantId);
  return result.data;
};

// Its verification documents, each with a link that works for 5 minutes
export const getAdminRestaurantDocumentsRequest = async (restaurantId) => {
  const result = await api.get("/admin/restaurants/" + restaurantId + "/documents");
  return result.data;
};

// Approve a pending restaurant, or reactivate a suspended one
export const approveRestaurantRequest = async (restaurantId) => {
  const result = await api.post("/admin/restaurants/" + restaurantId + "/approve");
  return result.data;
};

export const rejectRestaurantRequest = async (restaurantId, reason) => {
  const result = await api.post("/admin/restaurants/" + restaurantId + "/reject", { reason });
  return result.data;
};

export const suspendRestaurantRequest = async (restaurantId, reason) => {
  const result = await api.post("/admin/restaurants/" + restaurantId + "/suspend", { reason });
  return result.data;
};

// ─────────────────────────────────────────────
// Riders [AC-ADM-04]
// ─────────────────────────────────────────────

// filters = { status, page }. Returns { riders, meta }, oldest submission first.
export const getAdminRidersRequest = async (filters) => {
  const query = new URLSearchParams({ page: String(filters.page) });
  if (filters.status) {
    query.set("status", filters.status);
  }
  const result = await api.get("/admin/riders?" + query.toString());
  return { riders: result.data, meta: result.meta };
};

// One rider's application and account (Ghana Card masked)
export const getAdminRiderRequest = async (riderId) => {
  const result = await api.get("/admin/riders/" + riderId);
  return result.data;
};

// Ghana Card and licence photos, each with a 5-minute link
export const getAdminRiderDocumentsRequest = async (riderId) => {
  const result = await api.get("/admin/riders/" + riderId + "/documents");
  return result.data;
};

// The full Ghana Card number. Every look is written to the audit log.
export const revealGhanaCardRequest = async (riderId) => {
  const result = await api.post("/admin/riders/" + riderId + "/ghana-card/reveal");
  return result.data.ghanaCardNumber;
};

// Approve a pending rider, or reactivate a suspended one
export const approveRiderRequest = async (riderId) => {
  const result = await api.post("/admin/riders/" + riderId + "/approve");
  return result.data;
};

export const rejectRiderRequest = async (riderId, reason) => {
  const result = await api.post("/admin/riders/" + riderId + "/reject", { reason });
  return result.data;
};

export const suspendRiderRequest = async (riderId, reason) => {
  const result = await api.post("/admin/riders/" + riderId + "/suspend", { reason });
  return result.data;
};

// Every online rider: { id, fullName, phone, vehicleType, location, delivery }
export const getLiveRidersRequest = async () => {
  const result = await api.get("/admin/riders/live");
  return result.data;
};

// ─────────────────────────────────────────────
// Orders [AC-ADM-05]
// ─────────────────────────────────────────────

// filters = { q, status, from, to (YYYY-MM-DD), page }. Returns { orders, meta }, newest first.
// q: an order number, a customer phone (any format) or a restaurant name
export const getAdminOrdersRequest = async (filters) => {
  const query = new URLSearchParams({ page: String(filters.page) });
  for (const name of ["q", "status", "from", "to"]) {
    if (filters[name]) {
      query.set(name, filters[name]);
    }
  }
  const result = await api.get("/admin/orders?" + query.toString());
  return { orders: result.data, meta: result.meta };
};

// Everything about one order, with adminActions saying which buttons apply
export const getAdminOrderRequest = async (orderId) => {
  const result = await api.get("/admin/orders/" + orderId);
  return result.data;
};

// choice = { reason, refund: "FULL" | "PARTIAL" | "NONE", refundAmountPesewas (PARTIAL only) }
export const adminCancelOrderRequest = async (orderId, choice) => {
  const result = await api.post("/admin/orders/" + orderId + "/cancel", choice);
  return result.data;
};

// Give the order to this rider (or swap riders), before pickup
export const adminAssignRiderRequest = async (orderId, riderProfileId, reason) => {
  const result = await api.post("/admin/orders/" + orderId + "/rider", { riderProfileId, reason });
  return result.data;
};

// Take the rider off; the order goes back to the search
export const adminUnassignRiderRequest = async (orderId, reason) => {
  const result = await api.post("/admin/orders/" + orderId + "/rider/unassign", { reason });
  return result.data;
};

// After 5 wrong delivery codes, checked with the customer: let the rider try again
export const adminUnlockCodeRequest = async (orderId, reason) => {
  const result = await api.post("/admin/orders/" + orderId + "/delivery/unlock-code", { reason });
  return result.data;
};

// ─────────────────────────────────────────────
// Payments and refunds [AC-ADM-06]
// ─────────────────────────────────────────────

// filters = { flagged (true/false), status, q (reference or order number), page }
export const getAdminPaymentsRequest = async (filters) => {
  const query = new URLSearchParams({ page: String(filters.page) });
  if (filters.flagged) {
    query.set("flagged", "true");
  }
  if (filters.status) {
    query.set("status", filters.status);
  }
  if (filters.q) {
    query.set("q", filters.q);
  }
  const result = await api.get("/admin/payments?" + query.toString());
  return { payments: result.data, meta: result.meta };
};

// Ask Paystack again; returns { outcome, payment }
export const reverifyPaymentRequest = async (paymentId) => {
  const result = await api.post("/admin/payments/" + paymentId + "/reverify");
  return result.data;
};

// filters = { status, page }
export const getAdminRefundsRequest = async (filters) => {
  const query = new URLSearchParams({ page: String(filters.page) });
  if (filters.status) {
    query.set("status", filters.status);
  }
  const result = await api.get("/admin/refunds?" + query.toString());
  return { refunds: result.data, meta: result.meta };
};

// Send a failed refund to Paystack again
export const retryRefundRequest = async (refundId, reason) => {
  const result = await api.post("/admin/refunds/" + refundId + "/retry", { reason });
  return result.data;
};

// ─────────────────────────────────────────────
// Users [AC-ADM-02]
// ─────────────────────────────────────────────

// filters = { q (name, email or phone), role, status, page }. Returns { users, meta }.
export const getAdminUsersRequest = async (filters) => {
  const query = new URLSearchParams({ page: String(filters.page) });
  for (const name of ["q", "role", "status"]) {
    if (filters[name]) {
      query.set(name, filters[name]);
    }
  }
  const result = await api.get("/admin/users?" + query.toString());
  return { users: result.data, meta: result.meta };
};

// One account, with its orders count, restaurants or rider application
export const getAdminUserRequest = async (userId) => {
  const result = await api.get("/admin/users/" + userId);
  return result.data;
};

export const suspendUserRequest = async (userId, reason) => {
  const result = await api.post("/admin/users/" + userId + "/suspend", { reason });
  return result.data;
};

export const reactivateUserRequest = async (userId, reason) => {
  const result = await api.post("/admin/users/" + userId + "/reactivate", { reason });
  return result.data;
};

// ─────────────────────────────────────────────
// Audit log [AC-ADM-07]
// ─────────────────────────────────────────────

// filters = { action, targetType, targetId, actorId, from, to, page }. Returns { logs, meta }.
export const getAuditLogsRequest = async (filters) => {
  const query = new URLSearchParams({ page: String(filters.page) });
  for (const name of ["action", "targetType", "targetId", "actorId", "from", "to"]) {
    if (filters[name]) {
      query.set(name, filters[name]);
    }
  }
  const result = await api.get("/admin/audit-logs?" + query.toString());
  return { logs: result.data, meta: result.meta };
};

// The action names used so far, e.g. ["ORDER_CANCELLED", "USER_SUSPENDED"]
export const getAuditActionsRequest = async () => {
  const result = await api.get("/admin/audit-logs/actions");
  return result.data;
};

// ─────────────────────────────────────────────
// Reviews [AC-ADM-09, AC-REV-07]
// ─────────────────────────────────────────────

// filters = { hidden (true/false/undefined), maxRating (e.g. 2), page }
export const getAdminReviewsRequest = async (filters) => {
  const query = new URLSearchParams({ page: String(filters.page) });
  if (filters.hidden !== undefined) {
    query.set("hidden", String(filters.hidden));
  }
  if (filters.maxRating) {
    query.set("maxRating", String(filters.maxRating));
  }
  const result = await api.get("/admin/reviews?" + query.toString());
  return { reviews: result.data, meta: result.meta };
};

// Hide an abusive review: gone from the restaurant page and the averages
export const hideReviewRequest = async (reviewId, reason) => {
  const result = await api.post("/admin/reviews/" + reviewId + "/hide", { reason });
  return result.data;
};

// Show a hidden review again
export const showReviewRequest = async (reviewId, reason) => {
  const result = await api.post("/admin/reviews/" + reviewId + "/show", { reason });
  return result.data;
};
