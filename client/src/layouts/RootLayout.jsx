import { Outlet } from "react-router";
import Navbar from "./Navbar";
import Footer from "./Footer";

// The frame around every public page: navbar on top, footer at the bottom.
// <Outlet /> is the empty slot where React Router puts the page for the current URL.
const RootLayout = () => {
  return (
    <div className="flex min-h-svh flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default RootLayout;
