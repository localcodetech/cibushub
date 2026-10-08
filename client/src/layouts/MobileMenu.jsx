import { Link } from "react-router";

// The menu that drops down under the navbar on phones.
// links: the list to show. isOpen: should the menu show? onClose: the function that hides it.
// isLoggedIn: show the "Log out" button? onLogout: the function that logs out.
const MobileMenu = ({ links, isOpen, onClose, isLoggedIn, onLogout }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <nav aria-label="Mobile" className="border-t border-border bg-background md:hidden">
      <ul className="flex flex-col px-4 py-2">
        {links.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              onClick={onClose}
              className="flex min-h-11 items-center font-bold text-foreground"
            >
              {link.label}
            </Link>
          </li>
        ))}

        {isLoggedIn && (
          <li>
            <button
              type="button"
              onClick={onLogout}
              className="flex min-h-11 w-full items-center font-bold text-foreground"
            >
              Log out
            </button>
          </li>
        )}
      </ul>
    </nav>
  );
};

export default MobileMenu;
