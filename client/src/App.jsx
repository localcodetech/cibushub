import { createBrowserRouter, RouterProvider } from "react-router";
import RootLayout from "@/layouts/RootLayout";
import HomePage from "@/pages/public/HomePage";
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import NotFoundPage from "@/pages/NotFoundPage";

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
      // "*" catches every address not listed above
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

const App = () => {
  return <RouterProvider router={router} />;
};

export default App;
