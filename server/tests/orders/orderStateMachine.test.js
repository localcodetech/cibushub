import { describe, expect, it } from "vitest";
import { ORDER_STATUSES } from "../../src/models/order/order.model.js";
import {
  ORDER_TRANSITIONS,
  TERMINAL_STATUSES,
  assertTransitionAllowed,
  canTransition,
  nextStatusesFor,
} from "../../src/utils/order/orderStateMachine.js";

// Every move the business allows, written out by hand so a typo in the map is caught
const ALLOWED_MOVES = [
  ["PENDING_PAYMENT", "PAID"],
  ["PENDING_PAYMENT", "CANCELLED"],
  ["PAID", "ACCEPTED"],
  ["PAID", "REJECTED"],
  ["PAID", "CANCELLED"],
  ["ACCEPTED", "PREPARING"],
  ["ACCEPTED", "CANCELLED"],
  ["PREPARING", "READY_FOR_PICKUP"],
  ["PREPARING", "CANCELLED"],
  ["READY_FOR_PICKUP", "RIDER_ASSIGNED"],
  ["READY_FOR_PICKUP", "CANCELLED"],
  ["RIDER_ASSIGNED", "PICKED_UP"],
  ["RIDER_ASSIGNED", "READY_FOR_PICKUP"],
  ["RIDER_ASSIGNED", "CANCELLED"],
  ["PICKED_UP", "DELIVERED"],
  ["PICKED_UP", "CANCELLED"],
];

const isAllowedMove = (fromStatus, toStatus) =>
  ALLOWED_MOVES.some(([from, to]) => from === fromStatus && to === toStatus);

const errorFrom = (attempt) => {
  try {
    attempt();
  } catch (error) {
    return error;
  }
  return null;
};

describe("Order state machine [AC-ORD-01, AC-ORD-02]", () => {
  it("has a rule for every status, and no others", () => {
    expect(Object.keys(ORDER_TRANSITIONS).sort()).toEqual([...ORDER_STATUSES].sort());
  });

  // 10 x 10 = 100 pairs: each one is checked
  for (const fromStatus of ORDER_STATUSES) {
    for (const toStatus of ORDER_STATUSES) {
      const expected = isAllowedMove(fromStatus, toStatus);

      it(`${fromStatus} -> ${toStatus} is ${expected ? "allowed" : "refused"}`, () => {
        expect(canTransition(fromStatus, toStatus)).toBe(expected);
      });
    }
  }

  it("refuses PAID -> DELIVERED with 409 INVALID_STATUS_TRANSITION", () => {
    const error = errorFrom(() =>
      assertTransitionAllowed({ fromStatus: "PAID", toStatus: "DELIVERED", actorRole: "ADMIN" }),
    );

    expect(error.statusCode).toBe(409);
    expect(error.code).toBe("INVALID_STATUS_TRANSITION");
  });
});

describe("Terminal states [AC-ORD-07]", () => {
  it("lets nothing follow DELIVERED, REJECTED or CANCELLED", () => {
    for (const terminal of TERMINAL_STATUSES) {
      for (const toStatus of ORDER_STATUSES) {
        expect(canTransition(terminal, toStatus)).toBe(false);
      }
    }
  });
});

describe("Who may make each move [AC-ORD-03]", () => {
  const roleError = (fromStatus, toStatus, actorRole) =>
    errorFrom(() => assertTransitionAllowed({ fromStatus, toStatus, actorRole }));

  it("only the system marks an order paid", () => {
    expect(roleError("PENDING_PAYMENT", "PAID", "SYSTEM")).toBeNull();
    expect(roleError("PENDING_PAYMENT", "PAID", "CUSTOMER").statusCode).toBe(403);
    expect(roleError("PENDING_PAYMENT", "PAID", "ADMIN").statusCode).toBe(403);
  });

  it("only the restaurant accepts, rejects, prepares and readies", () => {
    expect(roleError("PAID", "ACCEPTED", "RESTAURANT_OWNER")).toBeNull();
    expect(roleError("PAID", "REJECTED", "RESTAURANT_OWNER")).toBeNull();
    expect(roleError("ACCEPTED", "PREPARING", "RESTAURANT_OWNER")).toBeNull();
    expect(roleError("PREPARING", "READY_FOR_PICKUP", "RESTAURANT_OWNER")).toBeNull();
    expect(roleError("PAID", "ACCEPTED", "CUSTOMER").statusCode).toBe(403);
    expect(roleError("PAID", "ACCEPTED", "RIDER").statusCode).toBe(403);
  });

  it("assigns a rider by system or admin only", () => {
    expect(roleError("READY_FOR_PICKUP", "RIDER_ASSIGNED", "SYSTEM")).toBeNull();
    expect(roleError("READY_FOR_PICKUP", "RIDER_ASSIGNED", "ADMIN")).toBeNull();
    expect(roleError("READY_FOR_PICKUP", "RIDER_ASSIGNED", "RIDER").statusCode).toBe(403);
  });

  it("only the rider picks up and delivers", () => {
    expect(roleError("RIDER_ASSIGNED", "PICKED_UP", "RIDER")).toBeNull();
    expect(roleError("PICKED_UP", "DELIVERED", "RIDER")).toBeNull();
    expect(roleError("PICKED_UP", "DELIVERED", "CUSTOMER")).toBeNull();
    expect(roleError("PICKED_UP", "DELIVERED", "RESTAURANT_OWNER").statusCode).toBe(403);
  });

  it("lets the customer cancel only before the restaurant accepts [AC-CANC-01, AC-CANC-02]", () => {
    expect(roleError("PENDING_PAYMENT", "CANCELLED", "CUSTOMER")).toBeNull();
    expect(roleError("PAID", "CANCELLED", "CUSTOMER")).toBeNull();
    expect(roleError("ACCEPTED", "CANCELLED", "CUSTOMER").statusCode).toBe(403);
    expect(roleError("PICKED_UP", "CANCELLED", "CUSTOMER").statusCode).toBe(403);
  });

  it("lets an admin, or super admin, cancel any order that is not finished [AC-CANC-03]", () => {
    for (const fromStatus of ORDER_STATUSES) {
      if (TERMINAL_STATUSES.includes(fromStatus)) {
        continue;
      }
      expect(roleError(fromStatus, "CANCELLED", "ADMIN")).toBeNull();
      expect(roleError(fromStatus, "CANCELLED", "SUPER_ADMIN")).toBeNull();
    }
  });
});

describe("nextStatusesFor", () => {
  it("lists the buttons each person may press", () => {
    expect(nextStatusesFor("PAID", "RESTAURANT_OWNER")).toEqual(["ACCEPTED", "REJECTED"]);
    expect(nextStatusesFor("PAID", "CUSTOMER")).toEqual(["CANCELLED"]);
    expect(nextStatusesFor("DELIVERED", "ADMIN")).toEqual([]);
  });
});
