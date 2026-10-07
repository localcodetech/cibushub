import sequelize from "../../config/database.js";
import AppError from "../../utils/AppError.js";
import { retryOnDeadlock } from "../../utils/database/retryOnDeadlock.js";
import { assertTransitionAllowed } from "../../utils/order/orderStateMachine.js";
import { increaseStock } from "../../repositories/menu.repository.js";
import {
  addStatusHistory,
  findOrderItems,
  lockOrder,
  updateOrder,
} from "../../repositories/order.repository.js";

// Stock goes back on the shelf when an order will never be made
const RELEASES_STOCK = ["CANCELLED", "REJECTED"];

// The ONE way an order's status changes, used by customers, restaurants, riders, admins and the system.
//   actor:       { userId, role }   (userId is null and role is "SYSTEM" for automatic changes)
//   isAllowedFor(order): true if this person may touch THIS order (their own, their restaurant's...)
// Everything happens in one transaction with the order row locked [AC-ORD-02, AC-ORD-04, AC-ORD-05]
export const changeOrderStatus = ({ orderId, toStatus, actor, reason, isAllowedFor }) => {
  return retryOnDeadlock(() =>
    sequelize.transaction(async (transaction) => {
      // 1. Lock the row: a second person changing it at the same moment waits here,
      //    then sees the NEW status, and the state machine refuses their move with 409
      const order = await lockOrder(orderId, transaction);

      // 2. Not theirs looks exactly like not existing
      if (!order || !isAllowedFor(order)) {
        throw new AppError(404, "NOT_FOUND", "Order not found");
      }

      // 3. Is this move on the map, and is this role allowed to make it?
      const fromStatus = order.status;
      assertTransitionAllowed({ fromStatus, toStatus, actorRole: actor.role });

      // 4. Change the status, keeping the reason for a cancellation
      const changes = { status: toStatus };
      if (toStatus === "CANCELLED") {
        changes.cancellationReason = reason;
      }
      await updateOrder(order, changes, transaction);

      // 5. Give back reserved stock [AC-CANC-06, AC-PAY-11]
      if (RELEASES_STOCK.includes(toStatus)) {
        const items = await findOrderItems(order.id, transaction);
        for (const item of items) {
          if (item.menuItemId) {
            await increaseStock(item.menuItemId, item.quantity, transaction);
          }
        }
      }

      // 6. The history row, in the same transaction as the change [AC-ORD-04]
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

      return order;
    }),
  );
};
