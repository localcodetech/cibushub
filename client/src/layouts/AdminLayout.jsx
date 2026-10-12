import { Suspense } from "react";
import { NavLink, Outlet } from "react-router";
import PageLoader from "@/components/common/PageLoader";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import Container from "./Container";

// The admin's pages, each reached from this menu. More are added as each screen is built.
const ADMIN_LINKS = [
  { label: "Overview", to: "/admin", end: true },
  { label: "Restaurants", to: "/admin/restaurants", end: false },
  { label: "Orders", to: "/admin/orders", end: false },
  { label: "Riders", to: "/admin/riders", end: false },
  { label: "Payments", to: "/admin/payments", end: false },
  { label: "Users", to: "/admin/users", end: false },
  { label: "Reviews", to: "/admin/reviews", end: false },
  { label: "Audit log", to: "/admin/audit-log", end: false },
];

// Only super admins see these [AC-SADM-01]
const SUPER_ADMIN_LINKS = [
  { label: "Admins", to: "/admin/admins", end: false },
  { label: "Settings", to: "/admin/settings", end: false },
];

// The frame around every admin page: the admin menu on top, then the page.
// overflow-x-auto: on a phone the menu scrolls sideways instead of wrapping.
const AdminLayout = () => {
  const user = useAuthStore((state) => state.user);
  let links = ADMIN_LINKS;
  if (user && user.role === "SUPER_ADMIN") {
    links = [...ADMIN_LINKS, ...SUPER_ADMIN_LINKS];
  }

  return (
    <>
      <div className="border-b border-border">
        <Container>
          <nav aria-label="Admin" className="flex gap-6 overflow-x-auto">
            {links.map((link) => (
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
