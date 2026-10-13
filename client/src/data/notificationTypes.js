import {
  Bell,
  Bike,
  ChefHat,
  CircleCheck,
  CircleX,
  Receipt,
  RotateCcw,
  ShoppingBag,
  Star,
  Store,
  TriangleAlert,
  UserRound,
} from "lucide-react";

// The icon and colour of each kind of notification (the type the server sends, e.g.
// "order.delivered"). An exact type wins; otherwise its group ("order.", "admin."...);
// anything new falls back to a plain bell. tone: a ListIcon tone.
const BY_TYPE = {
  "order.paid": { icon: ShoppingBag, tone: "primary" },
  "order.accepted": { icon: ChefHat, tone: "primary" },
  "order.preparing": { icon: ChefHat, tone: "primary" },
  "order.ready_for_pickup": { icon: ChefHat, tone: "primary" },
  "order.rider_assigned": { icon: Bike, tone: "primary" },
  "order.picked_up": { icon: Bike, tone: "primary" },
  "order.delivered": { icon: CircleCheck, tone: "success" },
  "order.rejected": { icon: CircleX, tone: "danger" },
  "order.cancelled": { icon: CircleX, tone: "danger" },
  "order.receipt": { icon: Receipt, tone: "muted" },
  "account.suspended": { icon: UserRound, tone: "danger" },
};

const BY_GROUP = {
  order: { icon: ShoppingBag, tone: "primary" },
  delivery: { icon: Bike, tone: "primary" },
  refund: { icon: RotateCcw, tone: "gold" },
  review: { icon: Star, tone: "gold" },
  restaurant: { icon: Store, tone: "primary" },
  rider: { icon: Bike, tone: "primary" },
  account: { icon: UserRound, tone: "muted" },
  admin: { icon: TriangleAlert, tone: "danger" },
};

const FALLBACK = { icon: Bell, tone: "muted" };

// "order.delivered" -> { icon: CircleCheck, tone: "success" }
export const notificationStyle = (type = "") => {
  return BY_TYPE[type] || BY_GROUP[type.split(".")[0]] || FALLBACK;
};
