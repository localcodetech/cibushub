import sequelize from "../../config/database.js";
import logger from "../../config/logger.js";
import { emitAdminAlert } from "../../sockets/emitAdminAlert.js";
import { notifyAdminsInApp } from "../notifications/inApp.service.js";
import { createRefund, fetchRefund } from "../payment/paystack.client.js";
import {
  notifyRefundProcessed,
  notifyRefundStarted,
} from "../notifications/refundNotice.service.js";
import { findOrderById, lockOrder, updateOrder } from "../../repositories/order.repository.js";
import { findUserById } from "../../repositories/user.repository.js";
import { findSuccessfulPayment } from "../../repositories/payment.repository.js";
import {
  findPendingRefunds,
  lockRefund,
  sumProcessedRefunds,
  updateRefund,
} from "../../repositories/refund.repository.js";

const BATCH_SIZE = 50;

// After a refund is processed: fully or partly refunded? [C9: payment status is separate]
const updateOrderPaymentStatus = async (orderId, transaction) => {
  const order = await lockOrder(orderId, transaction);
  const payment = await findSuccessfulPayment(orderId, transaction);
  const processed = await sumProcessedRefunds(orderId, transaction);

  const paymentStatus = processed >= payment.amountPesewas ? "REFUNDED" : "PARTIALLY_REFUNDED";
  await updateOrder(order, { paymentStatus }, transaction);
};

// One step forward for one refund. Run as often as you like: it only ever moves forward.
//   not sent yet    -> send to Paystack                       -> "SENT"
//   sent, finished  -> PROCESSED (or FAILED)                  -> "PROCESSED" / "FAILED"
//   sent, not yet   -> leave it, check again on the next run  -> "STILL_PENDING"
export const processRefund = async (refundId) => {
  const result = await sequelize.transaction(async (transaction) => {
    // The lock means two jobs can never send the same refund twice
    const refund = await lockRefund(refundId, transaction);

    if (!refund || refund.status !== "PENDING") {
      return { outcome: "ALREADY_DONE" };
    }

    const payment = await findSuccessfulPayment(refund.orderId, transaction);

    if (!refund.providerRefundId) {
      const sent = await createRefund({
        reference: payment.reference,
        amountPesewas: refund.amountPesewas,
        note: refund.reason,
      });
      await updateRefund(refund, { providerRefundId: sent.providerRefundId }, transaction);
      return { outcome: "SENT", refund, channel: payment.channel };
    }

    const { status } = await fetchRefund(refund.providerRefundId);

    if (status === "processed") {
      await updateRefund(refund, { status: "PROCESSED", processedAt: new Date() }, transaction);
      await updateOrderPaymentStatus(refund.orderId, transaction);
      return { outcome: "PROCESSED", refund };
    }

    if (status === "failed") {
      await updateRefund(
        refund,
        { status: "FAILED", failureReason: "Paystack refund failed" },
        transaction,
      );
      return { outcome: "FAILED", refund };
    }

    return { outcome: "STILL_PENDING" };
  });

  // Messages go out only after the change is safely saved [AC-CANC-07]
  if (result.outcome === "SENT" || result.outcome === "PROCESSED") {
    const order = await findOrderById(result.refund.orderId);
    const customer = await findUserById(order.customerId);

    if (result.outcome === "SENT") {
      await notifyRefundStarted({
        customer,
        order,
        refund: result.refund,
        channel: result.channel,
      });
    } else {
      await notifyRefundProcessed({ customer, order, refund: result.refund });
    }
  }

  if (result.outcome === "FAILED") {
    logger.error(
      { alert: "REFUND_FAILED", refundId, orderId: result.refund.orderId },
      "A refund failed at Paystack and needs an admin",
    );
    // Admins see it at once, and in their notification centre [AC-ADM-06]
    const order = await findOrderById(result.refund.orderId);
    emitAdminAlert("REFUND_FAILED", {
      refundId,
      orderId: order.id,
      orderNumber: order.orderNumber,
    });
    await notifyAdminsInApp({
      type: "admin.refund_failed",
      key: `refund:${refundId}:failed:${result.refund.updatedAt.getTime()}`,
      title: "Refund failed",
      body: `A refund for order ${order.orderNumber} failed at Paystack. Try it again from Payments.`,
      link: "/admin/payments",
    });
  }

  return result.outcome;
};

// Every 5 minutes: moves every PENDING refund one step forward (safety net for lost jobs too)
export const processPendingRefunds = async () => {
  const pending = await findPendingRefunds(BATCH_SIZE);

  const outcomes = {};
  for (const refund of pending) {
    try {
      const outcome = await processRefund(refund.id);
      outcomes[outcome] = (outcomes[outcome] || 0) + 1;
    } catch (error) {
      logger.error({ err: error, refundId: refund.id }, "Could not process refund");
    }
  }

  return { checked: pending.length, outcomes };
};
