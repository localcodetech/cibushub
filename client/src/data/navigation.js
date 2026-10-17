import { Bell, CircleHelp, LayoutDashboard, MapPin, ShoppingBag, UserRound } from "lucide-react";
import { homePathFor } from "@/utils/roleHome";

// Links shown to guests (people who are not logged in).
// Navbar and MobileMenu both read these lists, so a link is only written once.
export const guestLinks = [
  { label: "Log in", to: "/login" },
  { label: "Sign up", to: "/register" },
];

// The account menu of a logged-in user (desktop drop-down and phone menu): their dashboard,
// their profile, a customer's orders and addresses, notification settings and Help. "Log out" is added by the menus.
export const accountLinksFor = (role) => {
  const links = [
    { label: "My dashboard", to: homePathFor(role), icon: LayoutDashboard },
    { label: "My profile", to: "/account", icon: UserRound },
  ];
  if (role === "CUSTOMER") {
    links.push({ label: "My orders", to: "/customer/orders", icon: ShoppingBag });
    links.push({ label: "My addresses", to: "/customer/addresses", icon: MapPin });
  }
  links.push({ label: "Notification settings", to: "/notifications/settings", icon: Bell });
  links.push({ label: "Help", to: "/help", icon: CircleHelp });
  return links;
};
