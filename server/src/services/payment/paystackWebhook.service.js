import sequelize from "../../config/database.js";
import logger from "../../config/logger.js";
import { retryOnDeadlock } from "../../utils/database/retryOnDeadlock.js";
import { verifyTransaction } from "./paystack.client.js";
import { changeOrderStatus } from "../order/changeOrderStatus.service.js";
import { findOrderById, lockOrder, updateOrder } from "../../repositories/order.repository.js";
import {
  findPaymentByReference,
  lockPaymentByReference,
  updatePayment,
} from "../../repositories/payment.repository.js";
import { requestRefund } from "../refund/requestRefund.service.js";
import { emailReceipt } from "../notifications/receiptEmail.service.js";
import { emailAdmins } from "../notifications/adminAlertEmail.service.js";
import { notifyAdminsInApp } from "../notifications/inApp.service.js";
import { paymentMismatchEmail } from "../notifications/templates/emails.js";
import { emitAdminAlert } from "../../sockets/emitAdminAlert.js";
import { scheduleRestaurantTimeout } from "../../jobs/enqueue.js";

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

    // Logged here; the admins are alerted once the transaction is saved (reconcilePayment)
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

// Live alert + email to every admin. Never throws: the payment is already recorded.
const alertAdminsOfMismatch = async (reference, verified) => {
  try {
    const payment = await findPaymentByReference(reference);
    const order = await findOrderById(payment.orderId);
    const details = {
      reference,
      orderId: order.id,
      orderNumber: order.orderNumber,
      expectedPesewas: order.totalPesewas,
      receivedPesewas: verified.amountPesewas,
      currency: verified.currency,
    };
    emitAdminAlert("PAYMENT_AMOUNT_MISMATCH", details);
    await notifyAdminsInApp({
      type: "admin.payment_amount_mismatch",
      key: `payment:${payment.id}:mismatch`,
      title: "Payment amount mismatch",
      body: `Paystack payment ${reference} doesn't match order ${order.orderNumber}. The order was NOT marked paid.`,
    });
    await emailAdmins({
      type: "PAYMENT_AMOUNT_MISMATCH",
      key: `payment:${payment.id}:mismatch`,
      email: paymentMismatchEmail({
        reference,
        orderNumber: order.orderNumber,
        expected: order.totalPesewas,
        received: verified.amountPesewas,
        currency: verified.currency,
      }),
    });
  } catch (error) {
    logger.error({ err: error, reference }, "Could not alert admins about a payment mismatch");
  }
};

// Asks Paystack about one payment and records the answer. Used by the webhook, the
// reconciliation job and the unpaid-order expiry job [AC-PAY-05, AC-PAY-12]
export const reconcilePayment = async (reference) => {
  const verified = await verifyTransaction(reference);

  const outcome = await retryOnDeadlock(() =>
    sequelize.transaction((transaction) => applyVerification(reference, verified, transaction)),
  );

  // Only the delivery that actually marked it PAID sends the receipt, so it is sent once
  if (outcome === "ORDER_PAID") {
    const payment = await findPaymentByReference(reference);
    await emailReceipt(payment.orderId);
    // The restaurant now has 5 minutes to answer [AC-RORD-04]
    await scheduleRestaurantTimeout(payment.orderId);
  }

  // Only the delivery that found the mismatch gets this outcome, so admins hear once [AC-PAY-06]
  if (outcome === "AMOUNT_MISMATCH") {
    await alertAdminsOfMismatch(reference, verified);
  }

  return outcome;
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
