import { Bell, LayoutDashboard, MapPin, ShoppingBag } from "lucide-react";
import { homePathFor } from "@/utils/roleHome";

// Links shown to guests (people who are not logged in).
// Navbar and MobileMenu both read these lists, so a link is only written once.
export const guestLinks = [
  { label: "Log in", to: "/login" },
  { label: "Sign up", to: "/register" },
];

// The account menu of a logged-in user (desktop drop-down and phone menu): their dashboard,
// a customer's orders and addresses, and notification settings. "Log out" is added by the menus.
export const accountLinksFor = (role) => {
  const links = [{ label: "My dashboard", to: homePathFor(role), icon: LayoutDashboard }];
  if (role === "CUSTOMER") {
    links.push({ label: "My orders", to: "/customer/orders", icon: ShoppingBag });
    links.push({ label: "My addresses", to: "/customer/addresses", icon: MapPin });
  }
  links.push({ label: "Notification settings", to: "/notifications/settings", icon: Bell });
  return links;
};
