import { api } from "@/lib/api";

// Every call to the /admin endpoints lives here (admins and super admins only).

// Today's paid orders and GMV, active orders by status, riders online,
// approvals waiting and alerts [AC-ADM-01]
export const getAdminDashboardRequest = async () => {
  const result = await api.get("/admin/dashboard");
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
