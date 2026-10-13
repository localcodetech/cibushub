import { api } from "@/lib/api";

// Every call to the customer's /addresses and /maps endpoints lives here.

// My saved addresses, the default first [AC-CUST-03]
export const getAddressesRequest = async () => {
  const result = await api.get("/customer/addresses");
  return result.data;
};

// details = { label, latitude, longitude, ghanaPostGps?, area?, landmark?, deliveryInstructions? }
// The first address saved becomes the default.
export const createAddressRequest = async (details) => {
  const result = await api.post("/customer/addresses", details);
  return result.data;
};

// Sends only what changed
export const updateAddressRequest = async (addressId, changes) => {
  const result = await api.patch("/customer/addresses/" + addressId, changes);
  return result.data;
};

// Deleting the default makes the newest address left the default
export const deleteAddressRequest = async (addressId) => {
  await api.delete("/customer/addresses/" + addressId);
};

// Exactly one default; it is pre-selected at checkout [AC-CUST-07]
export const makeDefaultAddressRequest = async (addressId) => {
  const result = await api.post("/customer/addresses/" + addressId + "/default");
  return result.data;
};

// The maps endpoints exist for customers and for restaurant owners (placing their restaurant);
// mapsBase says which: "/customer/maps" (default) or "/owner/maps"

// Map pin -> { area, displayName }. area is null if the map service is down [AC-MAP-02, AC-MAP-06]
export const getPlaceForPinRequest = async (latitude, longitude, mapsBase = "/customer/maps") => {
  const query = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude) });
  const result = await api.get(mapsBase + "/reverse?" + query.toString());
  return result.data;
};

// Typed place -> up to 5 of { name, area, displayName, latitude, longitude }
export const searchPlacesRequest = async (text, mapsBase = "/customer/maps") => {
  const query = new URLSearchParams({ q: text });
  const result = await api.get(mapsBase + "/search?" + query.toString());
  return result.data;
};
