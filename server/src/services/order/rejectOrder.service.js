import sequelize from "../../config/database.js";
import { retryOnDeadlock } from "../../utils/database/retryOnDeadlock.js";
import { scheduleRefund } from "../../jobs/enqueue.js";
import { changeOrderStatus } from "./changeOrderStatus.service.js";
import { refundableAmount, requestRefund } from "../refund/requestRefund.service.js";

// Rejects an order and, if it was paid, writes the full refund in the SAME transaction,
// so "rejected" always means "money on its way back" [AC-RORD-03, AC-RORD-04, AC-CANC-04].
// Used by the owner's "Reject" and by the restaurant-timeout job.
//   actor:        { userId, role } (role "SYSTEM" with userId null for the timeout)
//   isAllowedFor: (order) => true if this actor may touch this order
//   onlyIfStatus: optional; refuse unless the order is still in this status when locked
export const rejectOrderWithRefund = async ({
  orderId,
  actor,
  reason,
  isAllowedFor,
  onlyIfStatus,
}) => {
  const refund = await retryOnDeadlock(() =>
    sequelize.transaction(async (transaction) => {
      const order = await changeOrderStatus({
        orderId,
        toStatus: "REJECTED",
        actor,
        reason,
        isAllowedFor,
        onlyIfStatus,
        transaction,
      });

      const amountPesewas = await refundableAmount(order, transaction);
      if (amountPesewas === 0) {
        return null;
      }
      return requestRefund({ order, amountPesewas, reason, actor, transaction });
    }),
  );

  // Send it to Paystack now (the every-5-minutes refund sweep is the safety net)
  if (refund) {
    await scheduleRefund(refund.id);
  }
};
