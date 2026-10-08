import { Link } from "react-router";
import { guestLinks } from "@/data/navigation";

// The menu that drops down under the navbar on phones.
// isOpen: should the menu show? onClose: the function that hides it again.
const MobileMenu = ({ isOpen, onClose }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <nav aria-label="Mobile" className="border-t border-border bg-background md:hidden">
      <ul className="flex flex-col px-4 py-2">
        {guestLinks.map((link) => (
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
      </ul>
    </nav>
  );
};

export default MobileMenu;
