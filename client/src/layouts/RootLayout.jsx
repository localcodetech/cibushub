import { Suspense } from "react";
import { Outlet, useLocation } from "react-router";
import { motion } from "motion/react";
import PageLoader from "@/components/common/PageLoader";
import ConnectionIndicator from "@/components/common/ConnectionIndicator";
import Navbar from "./Navbar";
import DemoBanner from "@/components/common/DemoBanner";
import CookieNotice from "@/components/common/CookieNotice";
import Footer from "./Footer";

// The frame around every public page: navbar on top, footer at the bottom.
// <Outlet /> is the empty slot where React Router puts the page for the current URL.
const RootLayout = () => {
  const location = useLocation();

  return (
    <div className="flex min-h-svh flex-col">
      <DemoBanner />
      <CookieNotice />
      <Navbar />
      <main className="flex-1">
        {/* While a lazy page's code downloads, show the spinner in its place */}
        <Suspense fallback={<PageLoader />}>
          {/* Each new page fades and rises in gently. Keyed by the address, so it plays once
              per page change. Reduced-motion users get the fade only (MotionConfig, main.jsx). */}
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <Outlet />
          </motion.div>
        </Suspense>
      </main>
      <Footer />
      <ConnectionIndicator />
    </div>
  );
};

export default RootLayout;
