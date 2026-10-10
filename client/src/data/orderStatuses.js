// What each order status means to a customer [AC-ORD-01, AC-ORD-06].
// label: short, for badges. description: one line for the timeline.
export const ORDER_STATUSES = {
  PENDING_PAYMENT: {
    label: "Waiting for payment",
    description: "Order placed, waiting for payment",
  },
  PAID: { label: "Sent to restaurant", description: "Paid and sent to the restaurant" },
  ACCEPTED: { label: "Accepted", description: "The restaurant accepted your order" },
  PREPARING: { label: "Preparing", description: "Your food is being prepared" },
  READY_FOR_PICKUP: { label: "Ready", description: "Ready, waiting for the rider" },
  RIDER_ASSIGNED: { label: "Rider assigned", description: "A rider is heading to the restaurant" },
  PICKED_UP: { label: "On the way", description: "Your rider is on the way to you" },
  DELIVERED: { label: "Delivered", description: "Delivered. Enjoy your meal!" },
  REJECTED: { label: "Rejected", description: "The restaurant couldn't take this order" },
  CANCELLED: { label: "Cancelled", description: "This order was cancelled" },
};

// The normal journey of an order, in order. REJECTED and CANCELLED can end it early.
export const ORDER_JOURNEY = [
  "PENDING_PAYMENT",
  "PAID",
  "ACCEPTED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "RIDER_ASSIGNED",
  "PICKED_UP",
  "DELIVERED",
];

// No more changes after these [AC-ORD-07]
export const FINISHED_STATUSES = ["DELIVERED", "REJECTED", "CANCELLED"];

// Why customers usually cancel; they pick one, and can add a few words
export const CANCEL_REASONS = [
  "Ordered by mistake",
  "Changed my mind",
  "Wrong delivery address",
  "Taking too long",
];
