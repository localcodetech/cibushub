import { Link } from "react-router";
import { DropdownMenu } from "radix-ui";
import { ChevronDown, LogOut } from "lucide-react";
import Avatar from "@/components/common/Avatar";
import { accountLinksFor } from "@/data/navigation";
import { ROLE_NAMES } from "@/data/userLabels";

const ITEM_CLASSES =
  "flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 font-bold outline-none " +
  "data-[highlighted]:bg-primary/[0.08]";

// Desktop: the logged-in user's name in the navbar, opening their account menu.
// Radix DropdownMenu gives the keyboard behaviour (arrows, Escape, focus back to the button).
const AccountMenu = ({ user, onLogout }) => {
  const firstName = user.fullName.split(" ")[0];

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={"Account menu for " + user.fullName}
        className="flex min-h-11 items-center gap-2 rounded-md px-1 font-bold focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none dark:focus-visible:ring-ring"
      >
        <Avatar name={user.fullName} className="size-8 bg-white/15 text-[13px] text-inherit" />
        {firstName}
        <ChevronDown size={16} aria-hidden="true" />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        {/* A floating layer: the one place the design guide allows a shadow */}
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-60 rounded-lg border border-border bg-background p-1 text-foreground shadow-lg"
        >
          <div className="px-3 py-2">
            <p className="font-bold">{user.fullName}</p>
            <p className="text-[13px] text-muted-foreground">{ROLE_NAMES[user.role]}</p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          {accountLinksFor(user.role).map((link) => (
            <DropdownMenu.Item key={link.to} asChild className={ITEM_CLASSES}>
              <Link to={link.to}>
                <link.icon size={18} className="text-primary" aria-hidden="true" />
                {link.label}
              </Link>
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item onSelect={onLogout} className={ITEM_CLASSES}>
            <LogOut size={18} className="text-muted-foreground" aria-hidden="true" />
            Log out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export default AccountMenu;
