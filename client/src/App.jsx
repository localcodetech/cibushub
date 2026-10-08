import { createBrowserRouter, RouterProvider } from "react-router";
import RootLayout from "@/layouts/RootLayout";
import HomePage from "@/pages/public/HomePage";
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import CustomerHomePage from "@/pages/customer/CustomerHomePage";
import OwnerDashboardPage from "@/pages/owner/OwnerDashboardPage";
import RiderHomePage from "@/pages/rider/RiderHomePage";
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import NotFoundPage from "@/pages/NotFoundPage";
import FullPageLoader from "@/components/common/FullPageLoader";
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

      // One home per role (guards that keep other roles out come next)
      { path: "customer", element: <CustomerHomePage /> },
      { path: "owner", element: <OwnerDashboardPage /> },
      { path: "rider", element: <RiderHomePage /> },
      { path: "admin", element: <AdminDashboardPage /> },

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
