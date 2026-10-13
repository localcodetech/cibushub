import { api } from "@/lib/api";

// Every call an owner makes to set up and run their restaurants (the Step 5 endpoints).
// Money is always whole pesewas; the pages turn GHS into pesewas before calling these.

// My restaurants, newest first, each with its status (and lastOrderAt)
export const getMyRestaurantsRequest = async () => {
  const result = await api.get("/owner/restaurants");
  return result.data;
};

// One of my restaurants, with its opening hours
export const getMyRestaurantRequest = async (restaurantId) => {
  const result = await api.get("/owner/restaurants/" + restaurantId);
  return result.data;
};

// details = { name, legalName, description?, phone, cuisineTags, addressLine, area, latitude,
//             longitude, openingHours: [7 days], minOrderPesewas, deliveryRadiusKm, prepTimeMinutes }
// The new restaurant waits for an admin's review (PENDING_APPROVAL) [AC-REST-01]
export const createRestaurantRequest = async (details) => {
  const result = await api.post("/owner/restaurants", details);
  return result.data;
};

// Some of those details changed (a legal name change sends it back for review)
export const updateRestaurantRequest = async (restaurantId, changes) => {
  const result = await api.patch("/owner/restaurants/" + restaurantId, changes);
  return result.data;
};

// The whole week's hours: [{ dayOfWeek: 0-6, isClosed, opensAt: "08:00", closesAt: "21:00" }]
export const updateOpeningHoursRequest = async (restaurantId, openingHours) => {
  const result = await api.put("/owner/restaurants/" + restaurantId + "/opening-hours", {
    openingHours,
  });
  return result.data;
};

// Open (true) or closed (false) for new orders, right now
export const setAcceptingOrdersRequest = async (restaurantId, isAcceptingOrders) => {
  const result = await api.patch("/owner/restaurants/" + restaurantId + "/accepting-orders", {
    isAcceptingOrders,
  });
  return result.data;
};

// After a rejection and fixes: back to the admin for review
export const resubmitRestaurantRequest = async (restaurantId) => {
  const result = await api.post("/owner/restaurants/" + restaurantId + "/resubmit");
  return result.data;
};

// kind: "logo" or "cover"; file: the picked image
export const uploadRestaurantImageRequest = async (restaurantId, kind, file) => {
  const form = new FormData();
  form.append("image", file);
  const result = await api.put("/owner/restaurants/" + restaurantId + "/" + kind, form);
  return result.data;
};

// Which verification documents are uploaded (never a link back: they are private)
export const getMyDocumentsRequest = async (restaurantId) => {
  const result = await api.get("/owner/restaurants/" + restaurantId + "/documents");
  return result.data;
};

// documentType: e.g. "FDA_CERTIFICATE"; file: a PDF or photo
export const uploadDocumentRequest = async (restaurantId, documentType, file) => {
  const form = new FormData();
  form.append("file", file);
  const result = await api.put(
    "/owner/restaurants/" + restaurantId + "/documents/" + documentType,
    form,
  );
  return result.data;
};
