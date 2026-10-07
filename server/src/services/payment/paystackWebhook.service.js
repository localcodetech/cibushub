import sequelize from "../../config/database.js";
import logger from "../../config/logger.js";
import { retryOnDeadlock } from "../../utils/database/retryOnDeadlock.js";
import { verifyTransaction } from "./paystack.client.js";
import { changeOrderStatus } from "../order/changeOrderStatus.service.js";
import { lockOrder, updateOrder } from "../../repositories/order.repository.js";
import { lockPaymentByReference, updatePayment } from "../../repositories/payment.repository.js";
import { requestRefund } from "../refund/requestRefund.service.js";

const SYSTEM = { userId: null, role: "SYSTEM" };

// Paystack's words for an attempt that did not go through. Anything else that is not "success"
// (ongoing, pending, processing, queued: e.g. a MoMo prompt still on the phone) stays PENDING.
const FAILED_STATUSES = { failed: "FAILED", abandoned: "ABANDONED", reversed: "FAILED" };

// What to do with one verified answer from Paystack, inside one transaction
const applyVerification = async (reference, verified, transaction) => {
  // Lock the payment: a duplicate webhook arriving at the same moment waits here
  const payment = await lockPaymentByReference(reference, transaction);

  if (!payment) {
    logger.warn({ reference }, "Paystack webhook for an unknown payment reference, ignored");
    return "UNKNOWN_REFERENCE";
  }

  // Already handled: a repeat delivery changes nothing [AC-PAY-07]
  if (payment.status !== "PENDING") {
    return "ALREADY_PROCESSED";
  }

  if (verified.status !== "success") {
    const failedStatus = FAILED_STATUSES[verified.status];
    if (!failedStatus) {
      return "STILL_PENDING";
    }

    await updatePayment(
      payment,
      { status: failedStatus, gatewayResponse: verified.gatewayResponse },
      transaction,
    );
    return "NOT_PAID";
  }

  const paymentDetails = {
    channel: verified.channel,
    providerTransactionId: verified.providerTransactionId,
    gatewayResponse: verified.gatewayResponse,
    paidAt: verified.paidAt,
  };

  const order = await lockOrder(payment.orderId, transaction);

  // Exactly the amount we asked for, in GHS, for exactly this order's total [AC-PAY-05, AC-PAY-06]
  const amountIsRight =
    verified.amountPesewas === payment.amountPesewas &&
    verified.amountPesewas === order.totalPesewas &&
    verified.currency === "GHS";

  if (!amountIsRight) {
    await updatePayment(payment, { ...paymentDetails, status: "AMOUNT_MISMATCH" }, transaction);

    // Admin alert: logged at error level now; the admin notifications step turns this into a message
    logger.error(
      {
        alert: "PAYMENT_AMOUNT_MISMATCH",
        reference,
        orderId: order.id,
        expectedPesewas: order.totalPesewas,
        receivedPesewas: verified.amountPesewas,
        currency: verified.currency,
      },
      "Paystack amount does not match the order total; order NOT marked paid",
    );
    return "AMOUNT_MISMATCH";
  }

  await updatePayment(payment, { ...paymentDetails, status: "SUCCESS" }, transaction);

  if (order.status === "PENDING_PAYMENT") {
    // The ONLY way an order becomes PAID [AC-ORD-03]
    await changeOrderStatus({
      orderId: order.id,
      toStatus: "PAID",
      actor: SYSTEM,
      reason: `Paystack payment ${reference}`,
      isAllowedFor: () => true,
      extraChanges: { paymentStatus: "PAID" },
      transaction,
    });
    return "ORDER_PAID";
  }

  // Money arrived for an order that was already cancelled (e.g. paid after the 30-minute expiry).
  // The order is NOT brought back; the money is recorded and fully refunded automatically.
  // The every-5-minutes refund sweep sends it to Paystack.
  await updateOrder(order, { paymentStatus: "PAID" }, transaction);
  await requestRefund({
    order,
    amountPesewas: verified.amountPesewas,
    reason: "Payment arrived after the order was closed",
    actor: SYSTEM,
    transaction,
  });
  logger.warn(
    { reference, orderId: order.id, orderStatus: order.status },
    "Payment received for a closed order; full refund started",
  );
  return "PAID_AFTER_CLOSE";
};

// Asks Paystack about one payment and records the answer. Used by the webhook, the
// reconciliation job and the unpaid-order expiry job [AC-PAY-05, AC-PAY-12]
export const reconcilePayment = async (reference) => {
  const verified = await verifyTransaction(reference);

  return retryOnDeadlock(() =>
    sequelize.transaction((transaction) => applyVerification(reference, verified, transaction)),
  );
};

// Handles one webhook event whose signature was already checked [AC-PAY-05, AC-PAY-07]
export const handlePaystackEvent = async (event) => {
  // Other events (transfers, subscriptions...) do not concern orders
  if (event.event !== "charge.success") {
    return "IGNORED";
  }

  const reference = event.data?.reference;
  if (!reference) {
    return "IGNORED";
  }

  // Never trust the webhook's own numbers: ask Paystack directly
  return reconcilePayment(reference);
};
