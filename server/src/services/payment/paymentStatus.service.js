import AppError from "../../utils/AppError.js";
import { findOrderById } from "../../repositories/order.repository.js";
import { findPaymentsForOrder } from "../../repositories/payment.repository.js";
import { verifyTransaction } from "./paystack.client.js";
import { reconcilePayment } from "./paystackWebhook.service.js";

// Paystack answers that are final: record them now, with the same code the webhook uses
const FINAL_PAYSTACK_STATUSES = ["success", "failed", "reversed"];

// What the "Confirming payment" page shows. The server asks Paystack itself, so a
// redirect or the browser can never mark an order paid [AC-PAY-09, AC-PAY-10].
//
// state:
//   PAID           the server confirmed it
//   PENDING        Paystack is still working on it (e.g. waiting for the MoMo approval)
//   NOT_COMPLETED  the customer left Paystack without paying; they can try again
//   FAILED         Paystack refused it (message says why); they can try again
//   PROBLEM        paid, but the amount was wrong: support looks at it [AC-PAY-06]
//   CLOSED         the order was cancelled (e.g. 30 minutes without payment) [AC-PAY-11]
//   NOT_STARTED    no payment was started yet
export const checkMyPaymentStatus = async (customerId, orderId, alreadyRecorded = false) => {
  const order = await findOrderById(orderId);

  if (!order || order.customerId !== customerId) {
    throw new AppError(404, "NOT_FOUND", "Order not found");
  }

  const answer = (state, message = null) => ({
    state,
    message,
    orderId: order.id,
    orderNumber: order.orderNumber,
    orderStatus: order.status,
    totalPesewas: order.totalPesewas,
  });

  // Paid (or paid and later refunded): the money arrived
  if (order.paymentStatus !== "UNPAID") {
    return answer("PAID");
  }

  if (order.status !== "PENDING_PAYMENT") {
    return answer("CLOSED", "This order was cancelled before it was paid");
  }

  const payments = await findPaymentsForOrder(order.id);
  const latest = payments[payments.length - 1];

  if (!latest) {
    return answer("NOT_STARTED");
  }

  if (latest.status === "FAILED" || latest.status === "ABANDONED") {
    return answer("FAILED", latest.gatewayResponse || "The payment didn't go through");
  }

  if (latest.status === "AMOUNT_MISMATCH") {
    return answer(
      "PROBLEM",
      "We're checking this payment. If money left your account, contact support with your order number",
    );
  }

  if (latest.status !== "PENDING" || alreadyRecorded) {
    return answer("PENDING");
  }

  // Still PENDING on our side: ask Paystack now instead of waiting for the webhook
  let verified;
  try {
    verified = await verifyTransaction(latest.reference);
  } catch {
    // Paystack didn't answer: keep waiting; the page asks again in a few seconds
    return answer("PENDING");
  }

  if (FINAL_PAYSTACK_STATUSES.includes(verified.status)) {
    // Same path as the webhook: checks amount and currency, marks PAID once, emails the receipt
    await reconcilePayment(latest.reference);
    return checkMyPaymentStatus(customerId, orderId, true);
  }

  // "abandoned" is not saved: Paystack also says it while a payment is still being made,
  // and saving it would block a payment that completes a moment later
  if (verified.status === "abandoned") {
    return answer("NOT_COMPLETED", "The payment wasn't completed");
  }

  return answer("PENDING");
};
