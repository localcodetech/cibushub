import { api } from "@/lib/api";

// Every call to the /super-admin endpoints lives here (super admins only) [AC-SADM-01].

export const getAdminsRequest = async () => {
  const result = await api.get("/super-admin/admins");
  return result.data;
};

// details = { fullName, email, phone, password, role: "ADMIN" | "SUPER_ADMIN" }
export const createAdminRequest = async (details) => {
  const result = await api.post("/super-admin/admins", details);
  return result.data;
};

export const suspendAdminRequest = async (userId, reason) => {
  const result = await api.post("/super-admin/admins/" + userId + "/suspend", { reason });
  return result.data;
};

export const reactivateAdminRequest = async (userId, reason) => {
  const result = await api.post("/super-admin/admins/" + userId + "/reactivate", { reason });
  return result.data;
};

// role: "ADMIN" or "SUPER_ADMIN"
export const changeAdminRoleRequest = async (userId, role, reason) => {
  const result = await api.patch("/super-admin/admins/" + userId + "/role", { role, reason });
  return result.data;
};

export const removeAdminRequest = async (userId, reason) => {
  const result = await api.post("/super-admin/admins/" + userId + "/remove", { reason });
  return result.data;
};
