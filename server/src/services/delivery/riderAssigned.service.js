import { changeOrderStatus } from "../order/changeOrderStatus.service.js";
import { findRiderProfileById } from "../../repositories/rider.repository.js";
import { emitToUser } from "../../sockets/emitToUser.js";

// ADR 003: the ORDER becomes RIDER_ASSIGNED once the food is ready AND a rider has accepted,
// at whichever moment comes second. Called at both moments, inside their transactions,
// after the delivery row is locked. Returns true if it moved the order.
// actor and reason: the system by default; an admin when they assign a rider by hand.
export const moveOrderToRiderAssignedIfReady = async (
  order,
  delivery,
  transaction,
  { actor = { userId: null, role: "SYSTEM" }, reason } = {},
) => {
  if (order.status !== "READY_FOR_PICKUP" || delivery.status !== "ASSIGNED") {
    return false;
  }

  await changeOrderStatus({
    orderId: order.id,
    toStatus: "RIDER_ASSIGNED",
    actor,
    reason,
    isAllowedFor: () => true,
    onlyIfStatus: "READY_FOR_PICKUP",
    transaction,
  });

  // The rider's delivery screen: "The food is ready, collect it" [AC-DEL-02]
  const rider = await findRiderProfileById(delivery.riderProfileId);
  transaction.afterCommit(() => emitToUser(rider.userId, "delivery:ready", { orderId: order.id }));
  return true;
};
