import { api } from "@/lib/api";

// Every call to the /admin endpoints lives here (admins and super admins only).

// Today's paid orders and GMV, active orders by status, riders online,
// approvals waiting and alerts [AC-ADM-01]
export const getAdminDashboardRequest = async () => {
  const result = await api.get("/admin/dashboard");
  return result.data;
};
