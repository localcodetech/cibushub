import { cn } from "@/lib/utils";

// A cream box with a border and 12px corners, for things that belong together
// (a restaurant, an order, the price summary).
// The design guide says: don't put everything in a card. Menus are lists; settings are rows.
//
// <Card>...</Card>
// <Card className="p-6">...</Card>  -> more padding for this one card
const Card = ({ className, children }) => {
  return (
    <div
      className={cn("rounded-lg border border-border bg-card p-4 text-card-foreground", className)}
    >
      {children}
    </div>
  );
};

export default Card;
