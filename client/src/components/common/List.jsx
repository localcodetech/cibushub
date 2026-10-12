import { Link } from "react-router";
import { ChevronRight, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import Card from "./Card";

// A boxed list with a line between rows: orders, users, riders, history, earnings...
// Every list in the app is built from these, so rows look and behave the same everywhere.
//
// <List>
//   <ListRow
//     to={"/customer/orders/" + order.id}
//     leading={<ListIcon icon={ShoppingBag} />}
//     title="Maame Akua's Chop Bar"
//     badge={<OrderStatusBadge status="DELIVERED" />}
//     meta="CH-261012-178425 · 12 Oct 2026, 15:34"
//     detail="GHS 172.34"
//   />
// </List>
//
// as: "ul" (default) or "ol" when the order means something (a timeline, newest first)
export const List = ({ as = "ul", className, children }) => {
  return (
    <Card
      as={as}
      padding="none"
      className={cn("divide-y divide-border overflow-hidden", className)}
    >
      {children}
    </Card>
  );
};

// One row.
//   leading:  an icon tile or an avatar on the left
//   title:    the main line (bold)
//   badge:    a status shown on the right of the title
//   meta:     a muted line under the title; wraps (up to 3 lines) rather than being cut off
//   detail:   a third line (e.g. the amount)
//   trailing: a value on the far right of the row (e.g. an amount or a count)
//   to:       the row is a link (whole row tappable, with a chevron)
//   href:     the row opens a file or another site in a new tab (e.g. an uploaded document)
//   onClick:  the row is a button (same look)
//   children: a row with its own layout; only the row padding is shared
export const ListRow = ({
  leading,
  title,
  badge,
  meta,
  detail,
  trailing,
  to,
  href,
  onClick,
  className,
  children,
}) => {
  const isInteractive = Boolean(to || href || onClick);

  const content = children ? (
    children
  ) : (
    <>
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="min-w-0 flex-1">
        {/* The title wraps and the badge stays on the right, so every row keeps its shape */}
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 flex-1 font-bold break-words">{title}</p>
          {badge && <div className="shrink-0">{badge}</div>}
        </div>
        {meta && <div className="mt-1 line-clamp-3 text-[13px] text-muted-foreground">{meta}</div>}
        {detail && <div className="mt-1 text-[15px]">{detail}</div>}
      </div>
      {trailing && <div className="shrink-0 text-right font-bold">{trailing}</div>}
      {href ? (
        <>
          <ExternalLink size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </>
      ) : (
        isInteractive && (
          <ChevronRight size={18} className="shrink-0 text-muted-foreground" aria-hidden="true" />
        )
      )}
    </>
  );

  const rowClass = cn(
    "flex w-full items-center gap-3 px-4 py-3 text-left",
    isInteractive &&
      "transition-colors duration-100 hover:bg-primary/[0.04] active:bg-primary/[0.08] " +
        "focus-visible:bg-primary/[0.04] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset",
    className,
  );

  if (to) {
    return (
      <li>
        <Link to={to} className={rowClass}>
          {content}
        </Link>
      </li>
    );
  }
  if (href) {
    return (
      <li>
        <a href={href} target="_blank" rel="noreferrer" className={rowClass}>
          {content}
        </a>
      </li>
    );
  }
  if (onClick) {
    return (
      <li>
        <button type="button" onClick={onClick} className={rowClass}>
          {content}
        </button>
      </li>
    );
  }
  return <li className={children ? cn("px-4 py-3", className) : rowClass}>{content}</li>;
};

// A small tinted square with an icon, at the start of a row
//   <ListIcon icon={ShoppingBag} />   tone: primary (default) | muted | danger | gold
const ICON_TONES = {
  primary: "bg-primary/10 text-primary",
  muted: "bg-muted text-muted-foreground",
  danger: "bg-destructive/10 text-destructive",
  gold: "bg-gold/15 text-gold-foreground dark:text-gold",
};

export const ListIcon = ({ icon: Icon, tone = "primary" }) => {
  return (
    <span className={cn("flex size-10 items-center justify-center rounded-md", ICON_TONES[tone])}>
      <Icon size={20} aria-hidden="true" />
    </span>
  );
};
