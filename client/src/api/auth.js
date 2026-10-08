import { api } from "@/lib/api";

// Every call to the backend's /auth endpoints lives here.
// Pages call these functions; they never write the URL themselves.

// identifier is an email or a Ghana phone number. The server sets the login cookies.
// Returns the logged-in user: { id, fullName, role, status, ... }
export const loginRequest = async (identifier, password) => {
  const result = await api.post("/auth/login", { identifier, password });
  return result.data;
};

// Who is logged in right now? Works only while the short access cookie (15 minutes) is valid.
export const getMeRequest = async () => {
  const result = await api.get("/auth/me");
  return result.data;
};

// Swaps the long refresh cookie (7 days) for new cookies, and returns the user.
export const refreshRequest = async () => {
  const result = await api.post("/auth/refresh");
  return result.data;
};

// Ends the session: the server cancels the refresh token and clears both cookies [AC-AUTH-16]
export const logoutRequest = async () => {
  await api.post("/auth/logout");
};

// Creates an account and texts a 6-digit code to the phone [AC-AUTH-01, AC-AUTH-05].
// details = { fullName, email, phone, password, role }. No login cookies yet:
// the user verifies their phone first. Returns the new user.
export const registerRequest = async (details) => {
  const result = await api.post("/auth/register", details);
  return result.data;
};
