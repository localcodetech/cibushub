import sequelize from "../../config/database.js";
import AppError from "../../utils/AppError.js";
import { retryOnDeadlock } from "../../utils/database/retryOnDeadlock.js";
import { assertTransitionAllowed } from "../../utils/order/orderStateMachine.js";
import { increaseStock } from "../../repositories/menu.repository.js";
import { emitOrderChanged } from "../../sockets/emitOrderChange.js";
import {
  addStatusHistory,
  findOrderItems,
  lockOrder,
  updateOrder,
} from "../../repositories/order.repository.js";

// Stock goes back on the shelf when an order will never be made
const RELEASES_STOCK = ["CANCELLED", "REJECTED"];

// The steps, inside a transaction that someone has already opened
const applyStatusChange = async (transaction, options) => {
  const {
    orderId,
    toStatus,
    actor,
    reason,
    isAllowedFor,
    extraChanges = {},
    onlyIfStatus,
  } = options;

  // 1. Lock the row: a second person changing it at the same moment waits here,
  //    then sees the NEW status, and the state machine refuses their move with 409
  const order = await lockOrder(orderId, transaction);

  // 2. Not theirs looks exactly like not existing
  if (!order || !isAllowedFor(order)) {
    throw new AppError(404, "NOT_FOUND", "Order not found");
  }

  // 3. A job that decided based on an older look ("still unpaid") must not act if that changed
  const fromStatus = order.status;
  if (onlyIfStatus && fromStatus !== onlyIfStatus) {
    throw new AppError(
      409,
      "INVALID_STATUS_TRANSITION",
      `The order is ${fromStatus}, no longer ${onlyIfStatus}`,
    );
  }

  // 4. Is this move on the map, and is this role allowed to make it?
  assertTransitionAllowed({ fromStatus, toStatus, actorRole: actor.role });

  // 5. Change the status (plus anything that must change with it, e.g. paymentStatus)
  const changes = { ...extraChanges, status: toStatus };
  if (toStatus === "CANCELLED") {
    changes.cancellationReason = reason;
  }
  await updateOrder(order, changes, transaction);

  // 6. Give back reserved stock [AC-CANC-06, AC-PAY-11]
  if (RELEASES_STOCK.includes(toStatus)) {
    const items = await findOrderItems(order.id, transaction);
    for (const item of items) {
      if (item.menuItemId) {
        await increaseStock(item.menuItemId, item.quantity, transaction);
      }
    }
  }

  // 7. The history row, in the same transaction as the change [AC-ORD-04]
  await addStatusHistory(
    {
      orderId: order.id,
      fromStatus,
      toStatus,
      actorUserId: actor.userId,
      actorRole: actor.role,
      reason: reason ?? null,
    },
    transaction,
  );

  // 8. Tell the live screens, but only once the change is really saved [AC-RT-03].
  //    afterCommit never runs if the transaction rolls back (or is retried after a deadlock).
  transaction.afterCommit(() => emitOrderChanged(order, fromStatus));

  return order;
};

// The ONE way an order's status changes, used by customers, restaurants, riders, admins and the system.
//   actor:        { userId, role }   (userId is null and role is "SYSTEM" for automatic changes)
//   isAllowedFor: (order) => true if this person may touch THIS order (their own, their restaurant's...)
//   extraChanges: other order columns saved in the same step, e.g. { paymentStatus: "PAID" }
//   onlyIfStatus: optional; refuse (409) unless the order is STILL in this status when locked
//   transaction:  optional; pass one to make this part of a bigger all-or-nothing change
// The order row is locked for the whole change [AC-ORD-02, AC-ORD-04, AC-ORD-05]
export const changeOrderStatus = (options) => {
  if (options.transaction) {
    return applyStatusChange(options.transaction, options);
  }

  return retryOnDeadlock(() =>
    sequelize.transaction((transaction) => applyStatusChange(transaction, options)),
  );
};
