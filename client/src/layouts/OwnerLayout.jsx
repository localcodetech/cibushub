import { Suspense } from "react";
import { NavLink, Outlet } from "react-router";
import PageLoader from "@/components/common/PageLoader";
import { cn } from "@/lib/utils";
import Container from "./Container";

// The owner's pages, each reached from this small menu
const OWNER_LINKS = [
  { label: "Orders", to: "/owner", end: true },
  { label: "History", to: "/owner/history", end: false },
];

// The frame around every owner page: the owner menu on top, then the page.
const OwnerLayout = () => {
  return (
    <>
      <div className="border-b border-border">
        <Container>
          <nav aria-label="Restaurant" className="flex gap-6">
            {OWNER_LINKS.map((link) => (
              // NavLink knows when its page is open, and marks it (aria-current="page")
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  cn(
                    "flex min-h-12 items-center border-b-2 font-bold",
                    isActive ? "border-primary text-primary" : "border-transparent",
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </Container>
      </div>
      {/* The menu stays while the next owner page's code downloads */}
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </>
  );
};

export default OwnerLayout;
