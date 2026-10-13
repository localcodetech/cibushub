import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Menu, X } from "lucide-react";
import { accountLinksFor, guestLinks } from "@/data/navigation";
import { useAuthStore } from "@/store/authStore";
import { prefetchGoogleSignIn } from "@/lib/googleSignIn";
import Container from "./Container";
import MobileMenu from "./MobileMenu";
import ThemeToggle from "@/components/common/ThemeToggle";
import CartButton from "./CartButton";
import NotificationBell from "./NotificationBell";
import AccountMenu from "./AccountMenu";

const Navbar = () => {
  // true when the phone menu is open, false when it is closed
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const isCheckingSession = useAuthStore((state) => state.isCheckingSession);
  const navigate = useNavigate();

  // A guest may log in or sign up soon: fetch Google's sign-in script in the background, so its
  // button is ready the moment they get there. Never for someone already logged in.
  useEffect(() => {
    if (!isCheckingSession && !user) {
      prefetchGoogleSignIn();
    }
  }, [isCheckingSession, user]);

  // Only guests and customers order food, so only they see the cart
  const canHaveCart = !user || user.role === "CUSTOMER";

  // The phone menu: guests get "Log in" and "Sign up"; a logged-in user their account links
  const links = user ? accountLinksFor(user.role) : guestLinks;

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
    // Forest Green in light mode. In dark mode the brand green is a light mint, too bright for a
    // whole bar, so the bar uses the dark surface and the logo carries the green
    <header className="brand-surface text-primary-foreground dark:border-b dark:border-border dark:text-foreground print:hidden">
      <Container>
        <div className="flex h-16 items-center justify-between">
          <Link
            to="/"
            onClick={closeMenu}
            className="font-heading text-2xl font-extrabold dark:text-primary"
          >
            CibusHub
          </Link>

          {/* Right side: links (big screens), theme switch, menu button (phones) */}
          <div className="flex items-center gap-2 md:gap-6">
            {/* Big screens, guests: log in, or sign up (the one gold call to action) */}
            {!user && (
              <nav aria-label="Main" className="hidden items-center gap-4 md:flex">
                <Link to="/login" className="font-bold hover:underline">
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="inline-flex min-h-10 items-center rounded-md bg-gold px-4 font-bold text-gold-foreground focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                >
                  Sign up
                </Link>
              </nav>
            )}

            {/* Every logged-in role has notifications [AC-NOTIF-07] */}
            {user && <NotificationBell />}

            {canHaveCart && <CartButton />}

            {/* Light / dark switch, on every screen size */}
            <ThemeToggle />

            {/* Big screens, logged in: the account menu (dashboard, orders, log out...) */}
            {user && (
              <div className="hidden md:block">
                <AccountMenu user={user} onLogout={handleLogout} />
              </div>
            )}

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
        user={user}
        isOpen={isMenuOpen}
        onClose={closeMenu}
        onLogout={handleLogout}
      />
      {/* The kente band under the header */}
      <div aria-hidden="true" className="kente-band h-1.5" />
    </header>
  );
};

export default Navbar;
