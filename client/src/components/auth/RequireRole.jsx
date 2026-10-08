import { Navigate } from "react-router";
import { useAuthStore } from "@/store/authStore";

// A guard placed around a page, so only the right roles can open it [AC-RBAC-07].
// The page inside is never drawn for anyone else, so it never fetches its data.
//
// In the router:
//   <RequireRole allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
//     <AdminDashboardPage />
//   </RequireRole>
const RequireRole = ({ allowedRoles, children }) => {
  const user = useAuthStore((state) => state.user);

  // Not logged in: go to the login page first
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in, but this page is for another role: show the 403 page
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/403" replace />;
  }

  // Right role: show the page
  return children;
};

export default RequireRole;
