// The owner's order board [AC-RORD-06]: one tab per stage, each with its statuses.
// (Delivered and rejected orders live in the history, not on the board.)
export const BOARD_TABS = [
  { key: "new", label: "New", statuses: ["PAID"] },
  { key: "accepted", label: "Accepted", statuses: ["ACCEPTED"] },
  { key: "preparing", label: "Preparing", statuses: ["PREPARING"] },
  { key: "ready", label: "Ready", statuses: ["READY_FOR_PICKUP"] },
  { key: "delivery", label: "Out for delivery", statuses: ["RIDER_ASSIGNED", "PICKED_UP"] },
];

// The time a restaurant has to answer before the order is rejected for them [AC-RORD-04].
// Must match RESTAURANT_RESPONSE_MINUTES on the server.
export const ANSWER_WITHIN_MINUTES = 5;

// Preparation times offered when accepting (minutes)
export const PREP_TIME_CHOICES = [10, 15, 20, 30, 45, 60];

// Common reasons to reject; the owner can also write their own [AC-RORD-03]
export const REJECT_REASONS = [
  "An item is out of stock",
  "Kitchen is closing",
  "Too busy right now",
];
