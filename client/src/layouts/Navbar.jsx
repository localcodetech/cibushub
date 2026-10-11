import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Menu, X } from "lucide-react";
import { guestLinks } from "@/data/navigation";
import { useAuthStore } from "@/store/authStore";
import { homePathFor } from "@/utils/roleHome";
import Container from "./Container";
import MobileMenu from "./MobileMenu";
import ThemeToggle from "@/components/common/ThemeToggle";
import CartButton from "./CartButton";
import NotificationBell from "./NotificationBell";

const Navbar = () => {
  // true when the phone menu is open, false when it is closed
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  // Guests see "Log in" and "Sign up"; a logged-in user sees a link to their own home
  // Only guests and customers order food, so only they see the cart
  const canHaveCart = !user || user.role === "CUSTOMER";

  let links = guestLinks;
  if (user) {
    links = [{ label: "My dashboard", to: homePathFor(user.role) }];
  }

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const handleLogout = async () => {
    closeMenu();
    await logout();
    navigate("/login");
  };

  return (
    <header className="bg-primary text-primary-foreground print:hidden">
      <Container>
        <div className="flex h-16 items-center justify-between">
          <Link to="/" onClick={closeMenu} className="font-heading text-2xl font-extrabold">
            CibusHub
          </Link>

          {/* Right side: links (big screens), theme switch, menu button (phones) */}
          <div className="flex items-center gap-2 md:gap-6">
            {/* Big screens: the links sit in the bar */}
            <nav aria-label="Main" className="hidden items-center gap-6 md:flex">
              {links.map((link) => (
                <Link key={link.to} to={link.to} className="font-bold hover:underline">
                  {link.label}
                </Link>
              ))}

              {/* Only a logged-in user can log out */}
              {user && (
                <button type="button" onClick={handleLogout} className="font-bold hover:underline">
                  Log out
                </button>
              )}
            </nav>

            {/* Every logged-in role has notifications [AC-NOTIF-07] */}
            {user && <NotificationBell />}

            {canHaveCart && <CartButton />}

            {/* Light / dark switch, on every screen size */}
            <ThemeToggle />

            {/* Phones: one button that opens and closes the menu */}
            <button
              type="button"
              onClick={toggleMenu}
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMenuOpen}
              className="flex size-11 items-center justify-center rounded-md md:hidden"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </Container>

      <MobileMenu
        links={links}
        isOpen={isMenuOpen}
        onClose={closeMenu}
        isLoggedIn={Boolean(user)}
        onLogout={handleLogout}
      />
    </header>
  );
};

export default Navbar;
