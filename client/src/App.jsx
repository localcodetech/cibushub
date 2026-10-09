import { lazy } from "react";
import { createBrowserRouter, RouterProvider } from "react-router";
import RootLayout from "@/layouts/RootLayout";
import HomePage from "@/pages/public/HomePage";
import PrivacyPage from "@/pages/public/PrivacyPage";
import TermsPage from "@/pages/public/TermsPage";
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import VerifyPhonePage from "@/pages/auth/VerifyPhonePage";
import AddPhonePage from "@/pages/auth/AddPhonePage";
import PendingApprovalPage from "@/pages/auth/PendingApprovalPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
import NotFoundPage from "@/pages/NotFoundPage";
import ForbiddenPage from "@/pages/ForbiddenPage";
import ErrorPage from "@/pages/ErrorPage";
import FullPageLoader from "@/components/common/FullPageLoader";
import RequireRole from "@/components/auth/RequireRole";
import { useAuthStore } from "@/store/authStore";

// Each role's pages load only when someone opens them [AC-PERF-06].
// A customer's phone never downloads the admin, owner or rider code.
// lazy(): "fetch this page's code the first time it is needed".
const CustomerHomePage = lazy(() => import("@/pages/customer/CustomerHomePage"));
const OwnerDashboardPage = lazy(() => import("@/pages/owner/OwnerDashboardPage"));
const RiderHomePage = lazy(() => import("@/pages/rider/RiderHomePage"));
const AdminDashboardPage = lazy(() => import("@/pages/admin/AdminDashboardPage"));

// The map of the app: which page shows for which address.
// Every page inside "children" is drawn inside RootLayout (navbar + footer).
const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    // If the navbar or footer itself crashes, the error page replaces everything
    errorElement: <ErrorPage />,
    children: [
      {
        // A page that crashes is replaced by the error page; the navbar and footer stay
        errorElement: <ErrorPage />,
        children: [
          // "index" means the address "/" itself
          { index: true, element: <HomePage /> },
          { path: "privacy", element: <PrivacyPage /> },
          { path: "terms", element: <TermsPage /> },
          { path: "login", element: <LoginPage /> },
          { path: "register", element: <RegisterPage /> },
          { path: "verify-phone", element: <VerifyPhonePage /> },
          { path: "add-phone", element: <AddPhonePage /> },
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
