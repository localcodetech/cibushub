import { Navigate, useLocation } from "react-router";
import { useAuthStore } from "@/store/authStore";

// A guard placed around a page, so only the right roles can open it [AC-RBAC-07],
// and only once their phone is verified and their account approved.
// The page inside is never drawn for anyone else, so it never fetches its data.
//
// In the router:
//   <RequireRole allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
//     <AdminDashboardPage />
//   </RequireRole>
const RequireRole = ({ allowedRoles, children }) => {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  // Not logged in: go to the login page first, remembering this page so login
  // can bring them back here (e.g. to checkout)
  if (!user) {
    return (
      <Navigate to="/login" replace state={{ returnTo: location.pathname + location.search }} />
    );
  }

  // Signed in with Google / Apple and no phone yet: add it first
  if (!user.phone) {
    return <Navigate to="/add-phone" replace />;
  }

  // Phone not verified yet: enter the SMS code first [AC-AUTH-01]
  if (!user.phoneVerifiedAt) {
    return <Navigate to="/verify-phone" replace />;
  }

  // Restaurant owner or rider waiting for an admin: show the "under review" page [AC-AUTH-05]
  if (user.status === "PENDING_APPROVAL") {
    return <Navigate to="/pending-approval" replace />;
  }

  // Logged in, but this page is for another role: show the 403 page
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/403" replace />;
  }

  // Right role: show the page
  return children;
};

export default RequireRole;
