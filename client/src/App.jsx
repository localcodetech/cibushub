import { createBrowserRouter, RouterProvider } from "react-router";
import RootLayout from "@/layouts/RootLayout";
import HomePage from "@/pages/public/HomePage";
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import VerifyPhonePage from "@/pages/auth/VerifyPhonePage";
import PendingApprovalPage from "@/pages/auth/PendingApprovalPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
import CustomerHomePage from "@/pages/customer/CustomerHomePage";
import OwnerDashboardPage from "@/pages/owner/OwnerDashboardPage";
import RiderHomePage from "@/pages/rider/RiderHomePage";
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import NotFoundPage from "@/pages/NotFoundPage";
import ForbiddenPage from "@/pages/ForbiddenPage";
import FullPageLoader from "@/components/common/FullPageLoader";
import RequireRole from "@/components/auth/RequireRole";
import { useAuthStore } from "@/store/authStore";

// The map of the app: which page shows for which address.
// Every page inside "children" is drawn inside RootLayout (navbar + footer).
const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      // "index" means the address "/" itself
      { index: true, element: <HomePage /> },
      { path: "login", element: <LoginPage /> },
      { path: "register", element: <RegisterPage /> },
      { path: "verify-phone", element: <VerifyPhonePage /> },
      { path: "pending-approval", element: <PendingApprovalPage /> },
      { path: "forgot-password", element: <ForgotPasswordPage /> },
      { path: "reset-password", element: <ResetPasswordPage /> },

      // One home per role. RequireRole keeps every other role out [AC-RBAC-07]
      {
        path: "customer",
        element: (
          <RequireRole allowedRoles={["CUSTOMER"]}>
            <CustomerHomePage />
          </RequireRole>
        ),
      },
      {
        path: "owner",
        element: (
          <RequireRole allowedRoles={["RESTAURANT_OWNER"]}>
            <OwnerDashboardPage />
          </RequireRole>
        ),
      },
      {
        path: "rider",
        element: (
          <RequireRole allowedRoles={["RIDER"]}>
            <RiderHomePage />
          </RequireRole>
        ),
      },
      {
        path: "admin",
        element: (
          <RequireRole allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
            <AdminDashboardPage />
          </RequireRole>
        ),
      },

      // Shown when a role opens a page that is not theirs
      { path: "403", element: <ForbiddenPage /> },

      // "*" catches every address not listed above
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

const App = () => {
  const isCheckingSession = useAuthStore((state) => state.isCheckingSession);

  // Wait until we know who is logged in, so pages never flash the wrong thing
  if (isCheckingSession) {
    return <FullPageLoader />;
  }

  return <RouterProvider router={router} />;
};

export default App;
