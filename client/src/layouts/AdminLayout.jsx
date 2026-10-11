import { Suspense } from "react";
import { NavLink, Outlet } from "react-router";
import PageLoader from "@/components/common/PageLoader";
import { cn } from "@/lib/utils";
import Container from "./Container";

// The admin's pages, each reached from this menu. More are added as each screen is built.
const ADMIN_LINKS = [
  { label: "Overview", to: "/admin", end: true },
  { label: "Restaurants", to: "/admin/restaurants", end: false },
  { label: "Orders", to: "/admin/orders", end: false },
  { label: "Riders", to: "/admin/riders", end: false },
  { label: "Payments", to: "/admin/payments", end: false },
  { label: "Users", to: "/admin/users", end: false },
];

// The frame around every admin page: the admin menu on top, then the page.
// overflow-x-auto: on a phone the menu scrolls sideways instead of wrapping.
const AdminLayout = () => {
  return (
    <>
      <div className="border-b border-border">
        <Container>
          <nav aria-label="Admin" className="flex gap-6 overflow-x-auto">
            {ADMIN_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  cn(
                    "flex min-h-12 shrink-0 items-center border-b-2 font-bold",
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
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </>
  );
};

export default AdminLayout;
