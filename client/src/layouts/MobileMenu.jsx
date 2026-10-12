import { Link } from "react-router";
import { LogOut } from "lucide-react";
import { ROLE_NAMES } from "@/data/userLabels";

// The menu that drops down under the navbar on phones.
// links:   the list to show (guest links, or the account links: data/navigation.js)
// user:    the logged-in user, or null for a guest (their name heads the menu)
// isOpen:  should the menu show? onClose: hides it. onLogout: logs out.
const MobileMenu = ({ links, user, isOpen, onClose, onLogout }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <nav aria-label="Mobile" className="border-t border-border bg-background md:hidden">
      {user && (
        <div className="border-b border-border px-4 py-3 text-foreground">
          <p className="font-bold">{user.fullName}</p>
          <p className="text-[13px] text-muted-foreground">{ROLE_NAMES[user.role]}</p>
        </div>
      )}
      <ul className="flex flex-col px-4 py-2">
        {links.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              onClick={onClose}
              className="flex min-h-12 items-center gap-3 font-bold text-foreground"
            >
              {link.icon && <link.icon size={18} className="text-primary" aria-hidden="true" />}
              {link.label}
            </Link>
          </li>
        ))}

        {user && (
          <li className="mt-1 border-t border-border pt-1">
            <button
              type="button"
              onClick={onLogout}
              className="flex min-h-12 w-full items-center gap-3 font-bold text-foreground"
            >
              <LogOut size={18} className="text-muted-foreground" aria-hidden="true" />
              Log out
            </button>
          </li>
        )}
      </ul>
    </nav>
  );
};

export default MobileMenu;
