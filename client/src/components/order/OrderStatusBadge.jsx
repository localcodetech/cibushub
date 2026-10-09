import { cn } from "@/lib/utils";
import { ORDER_STATUSES } from "@/data/orderStatuses";

// A small coloured pill with the order's status, e.g. "Preparing" [AC-CUST-09].
// Green while things go well, grey when waiting, red when it ended badly.
const OrderStatusBadge = ({ status }) => {
  const info = ORDER_STATUSES[status] || { label: status };

  let colours = "bg-primary/10 text-primary";
  if (status === "PENDING_PAYMENT") {
    colours = "bg-muted text-muted-foreground";
  }
  if (status === "CANCELLED" || status === "REJECTED") {
    colours = "bg-destructive/10 text-destructive";
  }

  return (
    <span
      className={cn(
        "inline-block shrink-0 rounded-full px-2.5 py-0.5 text-[13px] font-bold",
        colours,
      )}
    >
      {info.label}
    </span>
  );
};

export default OrderStatusBadge;
