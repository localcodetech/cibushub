import sequelize from "../../config/database.js";
import AppError from "../../utils/AppError.js";
import { retryOnDeadlock } from "../../utils/database/retryOnDeadlock.js";
import { scheduleRefund } from "../../jobs/enqueue.js";
import { changeOrderStatus } from "./changeOrderStatus.service.js";
import { refundableAmount, requestRefund } from "../refund/requestRefund.service.js";
import { saveAuditLog } from "../../repositories/auditLog.repository.js";
import { findOrderWithDetails, lockOrder } from "../../repositories/order.repository.js";
import {
  findDeliveryForOrderForUpdate,
  supersedePendingOffers,
  updateDelivery,
} from "../../repositories/delivery.repository.js";
import { findRiderProfileById } from "../../repositories/rider.repository.js";
import { emitToUser } from "../../sockets/emitToUser.js";

// A delivery is still going on unless it ended one of these ways
const FINISHED_DELIVERY_STATUSES = ["DELIVERED", "FAILED", "CANCELLED"];

// An admin cancels any order that is not finished, and chooses a full, partial or no refund.
// Cancel + refund + audit row are saved together, or not at all [AC-CANC-03, AC-ADM-07]
//   admin: { id, role, ipAddress }   choice: { reason, refund, refundAmountPesewas }
export const adminCancelOrder = async (admin, orderId, choice) => {
  const actor = { userId: admin.id, role: admin.role };

  const { refund, riderProfileId } = await retryOnDeadlock(() =>
    sequelize.transaction(async (transaction) => {
      // The delivery first, then the order: the lock order every delivery path uses
      const delivery = await findDeliveryForOrderForUpdate(orderId, transaction);

      // Look at it (locked) first, to record "before" in the audit log
      const before = await lockOrder(orderId, transaction);
      if (!before) {
        throw new AppError(404, "NOT_FOUND", "Order not found");
      }
      const previous = { status: before.status, paymentStatus: before.paymentStatus };

      const order = await changeOrderStatus({
        orderId,
        toStatus: "CANCELLED",
        actor,
        reason: choice.reason,
        isAllowedFor: () => true, // admins may touch any order
        transaction,
      });

      // How much goes back
      let amountPesewas = 0;
      if (choice.refund === "FULL") {
        amountPesewas = await refundableAmount(order, transaction);
        if (amountPesewas === 0) {
          throw new AppError(409, "NOTHING_TO_REFUND", "This order has no payment to refund");
        }
      }
      if (choice.refund === "PARTIAL") {
        amountPesewas = choice.refundAmountPesewas;
      }

      // Any refund problem (too much, nothing paid) throws here and undoes the cancel too
      const created =
        amountPesewas > 0
          ? await requestRefund({ order, amountPesewas, reason: choice.reason, actor, transaction })
          : null;

      await saveAuditLog(
        {
          actorId: admin.id,
          action: "ORDER_CANCELLED",
          targetType: "order",
          targetId: order.id,
          before: previous,
          after: { status: "CANCELLED", refund: choice.refund, refundAmountPesewas: amountPesewas },
          reason: choice.reason,
          ipAddress: admin.ipAddress,
        },
        transaction,
      );

      // A delivery in progress ends too, so its rider is free for new offers [AC-RIDER-06]
      let releasedRiderId = null;
      if (delivery && !FINISHED_DELIVERY_STATUSES.includes(delivery.status)) {
        releasedRiderId = delivery.riderProfileId;
        const now = new Date();
        await updateDelivery(delivery, { status: "CANCELLED", cancelledAt: now }, transaction);
        await supersedePendingOffers(delivery.id, now, transaction);
      }

      return { refund: created, riderProfileId: releasedRiderId };
    }),
  );

  // The rider's app closes the delivery screen
  if (riderProfileId) {
    const rider = await findRiderProfileById(riderProfileId);
    emitToUser(rider.userId, "delivery:unassigned", { orderId, reason: choice.reason });
  }

  if (refund) {
    await scheduleRefund(refund.id);
  }

  return findOrderWithDetails(orderId);
};
