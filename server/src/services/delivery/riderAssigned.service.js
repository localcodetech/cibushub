import { changeOrderStatus } from "../order/changeOrderStatus.service.js";

// ADR 003: the ORDER becomes RIDER_ASSIGNED once the food is ready AND a rider has accepted,
// at whichever moment comes second. Called at both moments, inside their transactions,
// after the delivery row is locked. Returns true if it moved the order.
export const moveOrderToRiderAssignedIfReady = async (order, delivery, transaction) => {
  if (order.status !== "READY_FOR_PICKUP" || delivery.status !== "ASSIGNED") {
    return false;
  }

  await changeOrderStatus({
    orderId: order.id,
    toStatus: "RIDER_ASSIGNED",
    actor: { userId: null, role: "SYSTEM" },
    isAllowedFor: () => true,
    onlyIfStatus: "READY_FOR_PICKUP",
    transaction,
  });
  return true;
};
