import { lazy } from "react";
import { createBrowserRouter, RouterProvider } from "react-router";
import RootLayout from "@/layouts/RootLayout";
import HomePage from "@/pages/public/HomePage";
import PrivacyPage from "@/pages/public/PrivacyPage";
import TermsPage from "@/pages/public/TermsPage";
import RestaurantsPage from "@/pages/public/RestaurantsPage";
import RestaurantDetailPage from "@/pages/public/RestaurantDetailPage";
import CartPage from "@/pages/public/CartPage";
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import VerifyPhonePage from "@/pages/auth/VerifyPhonePage";
import VerifyEmailPage from "@/pages/auth/VerifyEmailPage";
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
const AddressesPage = lazy(() => import("@/pages/customer/AddressesPage"));
// The map library is big, so it only downloads when this page opens
const AddressFormPage = lazy(() => import("@/pages/customer/AddressFormPage"));
const ReceiptPage = lazy(() => import("@/pages/customer/ReceiptPage"));
const CheckoutPage = lazy(() => import("@/pages/customer/CheckoutPage"));
const PaymentResultPage = lazy(() => import("@/pages/customer/PaymentResultPage"));
const OrdersPage = lazy(() => import("@/pages/customer/OrdersPage"));
const OrderDetailPage = lazy(() => import("@/pages/customer/OrderDetailPage"));
const OwnerLayout = lazy(() => import("@/layouts/OwnerLayout"));
const OwnerDashboardPage = lazy(() => import("@/pages/owner/OwnerDashboardPage"));
const OwnerHistoryPage = lazy(() => import("@/pages/owner/OwnerHistoryPage"));
const RiderLayout = lazy(() => import("@/layouts/RiderLayout"));
const RiderHomePage = lazy(() => import("@/pages/rider/RiderHomePage"));
const RiderDeliveryPage = lazy(() => import("@/pages/rider/RiderDeliveryPage"));
const RiderEarningsPage = lazy(() => import("@/pages/rider/RiderEarningsPage"));
const RiderApplicationPage = lazy(() => import("@/pages/rider/RiderApplicationPage"));
const AdminDashboardPage = lazy(() => import("@/pages/admin/AdminDashboardPage"));
const NotificationsPage = lazy(() => import("@/pages/NotificationsPage"));
const NotificationSettingsPage = lazy(() => import("@/pages/NotificationSettingsPage"));

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
          { path: "restaurants", element: <RestaurantsPage /> },
          { path: "restaurants/:restaurantId", element: <RestaurantDetailPage /> },
          { path: "cart", element: <CartPage /> },
          { path: "login", element: <LoginPage /> },
          { path: "register", element: <RegisterPage /> },
          { path: "verify-phone", element: <VerifyPhonePage /> },
          { path: "verify-email", element: <VerifyEmailPage /> },
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
            path: "customer/addresses",
            element: (
              <RequireRole allowedRoles={["CUSTOMER"]}>
                <AddressesPage />
              </RequireRole>
            ),
          },
          {
            path: "customer/addresses/new",
            element: (
              <RequireRole allowedRoles={["CUSTOMER"]}>
                <AddressFormPage />
              </RequireRole>
            ),
          },
          {
            path: "customer/addresses/:addressId/edit",
            element: (
              <RequireRole allowedRoles={["CUSTOMER"]}>
                <AddressFormPage />
              </RequireRole>
            ),
          },
          {
            path: "customer/orders/:orderId/receipt",
            element: (
              <RequireRole allowedRoles={["CUSTOMER"]}>
                <ReceiptPage />
              </RequireRole>
            ),
          },
          {
            path: "checkout",
            element: (
              <RequireRole allowedRoles={["CUSTOMER"]}>
                <CheckoutPage />
              </RequireRole>
            ),
          },
          {
            // Paystack sends customers back here (the server's callback_url)
            path: "orders/:orderId/payment",
            element: (
              <RequireRole allowedRoles={["CUSTOMER"]}>
                <PaymentResultPage />
              </RequireRole>
            ),
          },
          {
            path: "customer/orders",
            element: (
              <RequireRole allowedRoles={["CUSTOMER"]}>
                <OrdersPage />
              </RequireRole>
            ),
          },
          {
            path: "customer/orders/:orderId",
            element: (
              <RequireRole allowedRoles={["CUSTOMER"]}>
                <OrderDetailPage />
              </RequireRole>
            ),
          },
          {
            path: "owner",
            element: (
              <RequireRole allowedRoles={["RESTAURANT_OWNER"]}>
                <OwnerLayout />
              </RequireRole>
            ),
            children: [
              { index: true, element: <OwnerDashboardPage /> },
              { path: "history", element: <OwnerHistoryPage /> },
            ],
          },
          {
            path: "rider",
            element: (
              <RequireRole allowedRoles={["RIDER"]}>
                <RiderLayout />
              </RequireRole>
            ),
            children: [
              { index: true, element: <RiderHomePage /> },
              { path: "delivery", element: <RiderDeliveryPage /> },
              { path: "earnings", element: <RiderEarningsPage /> },
            ],
          },
          {
            // Filled in while the account waits for approval, so pending riders may open it
            path: "rider/apply",
            element: (
              <RequireRole allowedRoles={["RIDER"]} allowPending>
                <RiderApplicationPage />
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

          {
            // Every role's notification centre; open while waiting for approval too,
            // so a rider can read why their application was not approved
            path: "notifications",
            element: (
              <RequireRole
                allowedRoles={["CUSTOMER", "RESTAURANT_OWNER", "RIDER", "ADMIN", "SUPER_ADMIN"]}
                allowPending
              >
                <NotificationsPage />
              </RequireRole>
            ),
          },
          {
            // Yes or no to offers and news [AC-NOTIF-09]
            path: "notifications/settings",
            element: (
              <RequireRole
                allowedRoles={["CUSTOMER", "RESTAURANT_OWNER", "RIDER", "ADMIN", "SUPER_ADMIN"]}
              >
                <NotificationSettingsPage />
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
