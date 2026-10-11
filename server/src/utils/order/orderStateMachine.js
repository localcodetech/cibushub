import AppError from "../AppError.js";

// For each status: which statuses may come next, and who may make that move [AC-ORD-02, AC-ORD-03]
// "Who" is a role; whether it is THEIR order (owner of that restaurant, the assigned rider)
// is checked by the service that calls this, because that needs the database.
export const ORDER_TRANSITIONS = {
  PENDING_PAYMENT: {
    PAID: ["SYSTEM"], // only a verified payment webhook
    CANCELLED: ["CUSTOMER", "ADMIN", "SYSTEM"], // SYSTEM: unpaid for 30 minutes
  },
  PAID: {
    ACCEPTED: ["RESTAURANT_OWNER"],
    REJECTED: ["RESTAURANT_OWNER", "SYSTEM"], // SYSTEM: no answer within 5 minutes [AC-RORD-04]
    CANCELLED: ["CUSTOMER", "ADMIN", "SYSTEM"], // customer: only before the restaurant accepts
  },
  ACCEPTED: {
    PREPARING: ["RESTAURANT_OWNER"],
    CANCELLED: ["ADMIN"],
  },
  PREPARING: {
    READY_FOR_PICKUP: ["RESTAURANT_OWNER"],
    CANCELLED: ["ADMIN"],
  },
  READY_FOR_PICKUP: {
    RIDER_ASSIGNED: ["SYSTEM", "ADMIN"],
    CANCELLED: ["ADMIN"],
  },
  RIDER_ASSIGNED: {
    PICKED_UP: ["RIDER"],
    // The rider can't continue before pickup (breakdown) or an admin takes them off:
    // back to the pool while a new rider is found [AC-ASSIGN-08, ADR 003]
    READY_FOR_PICKUP: ["RIDER", "ADMIN"],
    CANCELLED: ["ADMIN"],
  },
  PICKED_UP: {
    // RIDER: with the customer's code. CUSTOMER: only after the code locked (5 wrong tries),
    // "I've received my food" (the service checks the lock) [AC-DEL-06]
    DELIVERED: ["RIDER", "CUSTOMER"],
    // SYSTEM: nobody took the food at the door within 10 minutes (no refund, food returned)
    CANCELLED: ["ADMIN", "SYSTEM"],
  },
  // The end of the road: nothing may follow these [AC-ORD-07]
  DELIVERED: {},
  REJECTED: {},
  CANCELLED: {},
};

export const TERMINAL_STATUSES = ["DELIVERED", "REJECTED", "CANCELLED"];

// A super admin can do everything an admin can
const ruleRoleFor = (actorRole) => (actorRole === "SUPER_ADMIN" ? "ADMIN" : actorRole);

export const isTerminal = (status) => TERMINAL_STATUSES.includes(status);

// Is this move on the map at all, for anyone?
export const canTransition = (fromStatus, toStatus) => {
  const allowedNext = ORDER_TRANSITIONS[fromStatus] || {};
  return toStatus in allowedNext;
};

// Throws if the move is not allowed: 409 for an impossible move, 403 for the wrong person
export const assertTransitionAllowed = ({ fromStatus, toStatus, actorRole }) => {
  if (!canTransition(fromStatus, toStatus)) {
    throw new AppError(
      409,
      "INVALID_STATUS_TRANSITION",
      `An order that is ${fromStatus} cannot be changed to ${toStatus}`,
    );
  }

  const allowedRoles = ORDER_TRANSITIONS[fromStatus][toStatus];

  if (!allowedRoles.includes(ruleRoleFor(actorRole))) {
    throw new AppError(403, "FORBIDDEN", "You do not have permission to do this");
  }
};

// The buttons a person may see for an order, e.g. ["ACCEPTED", "REJECTED"] for its restaurant
export const nextStatusesFor = (fromStatus, actorRole) => {
  const allowedNext = ORDER_TRANSITIONS[fromStatus] || {};

  return Object.keys(allowedNext).filter((toStatus) =>
    allowedNext[toStatus].includes(ruleRoleFor(actorRole)),
  );
};
