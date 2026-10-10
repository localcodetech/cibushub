import { Clock, MessageSquareText } from "lucide-react";
import { cn } from "@/lib/utils";
import Card from "@/components/common/Card";
import OrderStatusBadge from "@/components/order/OrderStatusBadge";
import { ANSWER_WITHIN_MINUTES } from "@/data/ownerBoard";
import { formatMoney } from "@/utils/money";
import { formatTime } from "@/utils/date";

const MINUTE_MS = 60 * 1000;

// "3 min ago", "1 h 5 min ago"
const formatAgo = (fromIso, now) => {
  const minutes = Math.max(0, Math.floor((now - new Date(fromIso).getTime()) / MINUTE_MS));
  if (minutes < 60) {
    return minutes + " min ago";
  }
  return Math.floor(minutes / 60) + " h " + (minutes % 60) + " min ago";
};

// "4:07" left to answer, counted from the moment it was paid [AC-RORD-04]
const answerTimeLeft = (paidAtIso, now) => {
  const deadline = new Date(paidAtIso).getTime() + ANSWER_WITHIN_MINUTES * MINUTE_MS;
  const secondsLeft = Math.max(0, Math.ceil((deadline - now) / 1000));
  return {
    secondsLeft,
    text: Math.floor(secondsLeft / 60) + ":" + String(secondsLeft % 60).padStart(2, "0"),
  };
};

// The buttons each next status gets. Reject is red and always asks first [AC-UX-07].
const ACTION_BUTTONS = {
  ACCEPTED: { label: "Accept", style: "bg-primary text-primary-foreground" },
  REJECTED: { label: "Reject", style: "border border-destructive text-destructive" },
  PREPARING: { label: "Start preparing", style: "bg-primary text-primary-foreground" },
  READY_FOR_PICKUP: { label: "Ready for pickup", style: "bg-primary text-primary-foreground" },
};

// One order as the kitchen sees it [AC-RORD-02]: number, first name, items with options,
// the customer's note, when it came in and how long ago. No phone, no address.
//
// now:             Date.now(), ticking, for the countdown and "min ago"
// showRestaurant:  true when the owner has more than one restaurant
// isWorking:       a button was tapped and the server hasn't answered yet
// error:           why the last tap failed, if it did
// onAction(order, toStatus): a button was tapped
const KitchenOrderCard = ({ order, now, showRestaurant, isWorking, error, onAction }) => {
  const isNew = order.status === "PAID";
  const timeLeft = isNew && order.paidAt ? answerTimeLeft(order.paidAt, now) : null;

  return (
    <Card
      className={cn(
        "flex flex-col gap-3",
        // A new order stands out: thick border, so it is seen from across the kitchen [AC-RORD-01]
        isNew && "border-2 border-amber-500",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-heading text-xl font-bold">{order.orderNumber}</p>
          <p className="text-[15px] text-muted-foreground">
            For {order.customerFirstName}
            {showRestaurant && order.restaurant && " · " + order.restaurant.name}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <p className="flex flex-wrap items-center gap-x-2 text-[15px] text-muted-foreground">
        <Clock size={16} aria-hidden="true" />
        Came in {formatTime(order.paidAt || order.placedAt)} ·{" "}
        {formatAgo(order.paidAt || order.placedAt, now)}
      </p>

      {/* The clock to answer: red in the last minute */}
      {timeLeft && (
        <p
          className={cn(
            "rounded-md px-3 py-2 text-[15px] font-bold",
            timeLeft.secondsLeft <= 60
              ? "bg-destructive/10 text-destructive"
              : "bg-amber-500/15 text-amber-800 dark:text-amber-300",
          )}
        >
          {timeLeft.secondsLeft > 0
            ? "Answer within " + timeLeft.text + " or it is rejected automatically"
            : "Time is up: this order is being rejected"}
        </p>
      )}

      {order.estimatedReadyAt && !isNew && (
        <p className="text-[15px]">
          Ready by <span className="font-bold">{formatTime(order.estimatedReadyAt)}</span>
        </p>
      )}

      <ul className="space-y-2 border-t border-border pt-3">
        {order.items.map((item) => (
          <li key={item.id}>
            <p className="font-bold">
              {item.quantity} × {item.name}
            </p>
            {item.options.length > 0 && (
              <p className="text-[15px] text-muted-foreground">
                {item.options.map((option) => option.name).join(", ")}
              </p>
            )}
          </li>
        ))}
      </ul>

      {order.restaurantNote && (
        <p className="flex gap-2 rounded-md bg-muted px-3 py-2 text-[15px]">
          <MessageSquareText size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-bold">Note: </span>
            {order.restaurantNote}
          </span>
        </p>
      )}

      <p className="flex justify-between border-t border-border pt-3 text-[15px]">
        <span className="text-muted-foreground">Food total</span>
        <span className="font-bold">{formatMoney(order.subtotalPesewas)}</span>
      </p>

      {error && (
        <p role="alert" className="text-[15px] text-destructive">
          {error}
        </p>
      )}

      {order.ownerActions.length > 0 && (
        // Reject on the left, the main action on the right (and on top on phones)
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          {[...order.ownerActions].reverse().map((toStatus) => {
            const button = ACTION_BUTTONS[toStatus];
            if (!button) {
              return null;
            }
            return (
              <button
                key={toStatus}
                type="button"
                disabled={isWorking}
                onClick={() => onAction(order, toStatus)}
                className={cn(
                  "min-h-12 flex-1 rounded-md px-4 font-bold disabled:opacity-60",
                  button.style,
                )}
              >
                {button.label}
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default KitchenOrderCard;
