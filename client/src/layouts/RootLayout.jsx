import { Suspense } from "react";
import { Outlet } from "react-router";
import PageLoader from "@/components/common/PageLoader";
import ConnectionIndicator from "@/components/common/ConnectionIndicator";
import Navbar from "./Navbar";
import DemoBanner from "@/components/common/DemoBanner";
import Footer from "./Footer";

// The frame around every public page: navbar on top, footer at the bottom.
// <Outlet /> is the empty slot where React Router puts the page for the current URL.
const RootLayout = () => {
  return (
    <div className="flex min-h-svh flex-col">
      <DemoBanner />
      <Navbar />
      <main className="flex-1">
        {/* While a lazy page's code downloads, show the spinner in its place */}
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <ConnectionIndicator />
    </div>
  );
};

export default RootLayout;
