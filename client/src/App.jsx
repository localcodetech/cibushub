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
import ErrorState from "@/components/common/ErrorState";
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
const OwnerReviewsPage = lazy(() => import("@/pages/owner/OwnerReviewsPage"));
const OwnerAnalyticsPage = lazy(() => import("@/pages/owner/OwnerAnalyticsPage"));
const OwnerRestaurantsPage = lazy(() => import("@/pages/owner/OwnerRestaurantsPage"));
const NewRestaurantPage = lazy(() => import("@/pages/owner/NewRestaurantPage"));
const RestaurantSettingsPage = lazy(() => import("@/pages/owner/RestaurantSettingsPage"));
const MenuBuilderPage = lazy(() => import("@/pages/owner/MenuBuilderPage"));
const RiderLayout = lazy(() => import("@/layouts/RiderLayout"));
const RiderHomePage = lazy(() => import("@/pages/rider/RiderHomePage"));
const RiderDeliveryPage = lazy(() => import("@/pages/rider/RiderDeliveryPage"));
const RiderEarningsPage = lazy(() => import("@/pages/rider/RiderEarningsPage"));
const RiderApplicationPage = lazy(() => import("@/pages/rider/RiderApplicationPage"));
const AdminLayout = lazy(() => import("@/layouts/AdminLayout"));
const AdminDashboardPage = lazy(() => import("@/pages/admin/AdminDashboardPage"));
const AdminRestaurantsPage = lazy(() => import("@/pages/admin/AdminRestaurantsPage"));
const AdminRestaurantDetailPage = lazy(() => import("@/pages/admin/AdminRestaurantDetailPage"));
const AdminOrdersPage = lazy(() => import("@/pages/admin/AdminOrdersPage"));
const AdminOrderDetailPage = lazy(() => import("@/pages/admin/AdminOrderDetailPage"));
const AdminRidersPage = lazy(() => import("@/pages/admin/AdminRidersPage"));
const AdminPaymentsPage = lazy(() => import("@/pages/admin/AdminPaymentsPage"));
const AdminUsersPage = lazy(() => import("@/pages/admin/AdminUsersPage"));
const AdminUserDetailPage = lazy(() => import("@/pages/admin/AdminUserDetailPage"));
const AdminAuditLogPage = lazy(() => import("@/pages/admin/AdminAuditLogPage"));
const AdminReviewsPage = lazy(() => import("@/pages/admin/AdminReviewsPage"));
const SuperAdminAdminsPage = lazy(() => import("@/pages/admin/SuperAdminAdminsPage"));
const SuperAdminSettingsPage = lazy(() => import("@/pages/admin/SuperAdminSettingsPage"));
const AdminRiderMapPage = lazy(() => import("@/pages/admin/AdminRiderMapPage"));
const AdminRiderDetailPage = lazy(() => import("@/pages/admin/AdminRiderDetailPage"));
const NotificationsPage = lazy(() => import("@/pages/NotificationsPage"));
const NotificationSettingsPage = lazy(() => import("@/pages/NotificationSettingsPage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));

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
            // Setting up restaurants: open to owners still waiting for approval, because
            // registering their first restaurant is how they get approved [AC-REST-01]
            path: "owner/restaurants",
            element: (
              <RequireRole allowedRoles={["RESTAURANT_OWNER"]} allowPending>
                <OwnerLayout />
              </RequireRole>
            ),
            children: [
              { index: true, element: <OwnerRestaurantsPage /> },
              { path: "new", element: <NewRestaurantPage /> },
              { path: ":restaurantId", element: <RestaurantSettingsPage /> },
              { path: ":restaurantId/menu", element: <MenuBuilderPage /> },
            ],
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
              { path: "reviews", element: <OwnerReviewsPage /> },
              { path: "analytics", element: <OwnerAnalyticsPage /> },
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
                <AdminLayout />
              </RequireRole>
            ),
            children: [
              { index: true, element: <AdminDashboardPage /> },
              { path: "restaurants", element: <AdminRestaurantsPage /> },
              { path: "restaurants/:restaurantId", element: <AdminRestaurantDetailPage /> },
              { path: "orders", element: <AdminOrdersPage /> },
              { path: "orders/:orderId", element: <AdminOrderDetailPage /> },
              { path: "riders", element: <AdminRidersPage /> },
              // Before "riders/:riderId", so "map" isn't read as a rider id
              { path: "riders/map", element: <AdminRiderMapPage /> },
              { path: "riders/:riderId", element: <AdminRiderDetailPage /> },
              { path: "payments", element: <AdminPaymentsPage /> },
              { path: "users", element: <AdminUsersPage /> },
              { path: "users/:userId", element: <AdminUserDetailPage /> },
              { path: "audit-log", element: <AdminAuditLogPage /> },
              { path: "reviews", element: <AdminReviewsPage /> },
              {
                // Super admins only, inside the admin area [AC-SADM-01]
                path: "admins",
                element: (
                  <RequireRole allowedRoles={["SUPER_ADMIN"]}>
                    <SuperAdminAdminsPage />
                  </RequireRole>
                ),
              },
              {
                // Super admins only: fees, commission, time limits [AC-SADM-02]
                path: "settings",
                element: (
                  <RequireRole allowedRoles={["SUPER_ADMIN"]}>
                    <SuperAdminSettingsPage />
                  </RequireRole>
                ),
              },
            ],
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
            // My profile: name, photo, phone, email, password [AC-CUST-01, AC-CUST-02, AC-AUTH-20]
            path: "account",
            element: (
              <RequireRole
                allowedRoles={["CUSTOMER", "RESTAURANT_OWNER", "RIDER", "ADMIN", "SUPER_ADMIN"]}
              >
                <ProfilePage />
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
  const sessionError = useAuthStore((state) => state.sessionError);
  const checkSession = useAuthStore((state) => state.checkSession);

  // Wait until we know who is logged in, so pages never flash the wrong thing
  if (isCheckingSession) {
    return <FullPageLoader />;
  }

  // We couldn't find out (not "logged out": e.g. too many requests or no connection)
  if (sessionError) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <ErrorState
          message={"We couldn't check your login. " + sessionError}
          onRetry={checkSession}
        />
      </main>
    );
  }

  return <RouterProvider router={router} />;
};

export default App;
