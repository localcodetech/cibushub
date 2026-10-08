import { api } from "@/lib/api";

// Every call to the backend's /auth endpoints lives here.
// Pages call these functions; they never write the URL themselves.

// identifier is an email or a Ghana phone number. The server sets the login cookies.
// Returns the logged-in user: { id, fullName, role, status, ... }
export const loginRequest = async (identifier, password) => {
  const result = await api.post("/auth/login", { identifier, password });
  return result.data;
};
