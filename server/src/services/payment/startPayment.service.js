import { randomBytes } from "node:crypto";
import env from "../../config/env/env.js";
import AppError from "../../utils/AppError.js";
import { initializeTransaction } from "./paystack.client.js";
import { findOrderWithDetails } from "../../repositories/order.repository.js";
import { findUserById } from "../../repositories/user.repository.js";
import { createPayment, findRecentPendingPayment } from "../../repositories/payment.repository.js";

// A checkout opened in the last 10 minutes is reused instead of starting a second one
const REUSE_PENDING_MINUTES = 10;

// e.g. CH-261009-482193-9F3A1C: the order number plus a random ending, new for every attempt
const newReference = (orderNumber) =>
  `${orderNumber}-${randomBytes(3).toString("hex").toUpperCase()}`;

const toCheckout = (payment) => ({
  paymentId: payment.id,
  reference: payment.reference,
  amountPesewas: payment.amountPesewas,
  currency: payment.currency,
  authorizationUrl: payment.authorizationUrl,
  accessCode: payment.accessCode,
});

// Start (or retry) paying for one of my orders [AC-PAY-01, AC-PAY-10]
export const startPayment = async (customerId, orderId) => {
  const order = await findOrderWithDetails(orderId);

  if (!order || order.customerId !== customerId) {
    throw new AppError(404, "NOT_FOUND", "Order not found");
  }

  if (order.status !== "PENDING_PAYMENT" || order.paymentMethod !== "PAYSTACK") {
    throw new AppError(409, "ORDER_NOT_PAYABLE", `An order that is ${order.status} cannot be paid`);
  }

  // A double tap, or coming back to the page: same checkout, not a second charge
  const since = new Date(Date.now() - REUSE_PENDING_MINUTES * 60 * 1000);
  const recent = await findRecentPendingPayment(order.id, since);
  if (recent && recent.amountPesewas === order.totalPesewas) {
    return toCheckout(recent);
  }

  const customer = await findUserById(customerId);
  const reference = newReference(order.orderNumber);

  // The amount is the order's stored total, never anything the browser sends
  const { authorizationUrl, accessCode } = await initializeTransaction({
    email: customer.email,
    amountPesewas: order.totalPesewas,
    reference,
    // Paystack sends the customer back here; that page then waits for OUR confirmation [AC-PAY-09]
    callbackUrl: `${env.CLIENT_URL}/orders/${order.id}/payment`,
    metadata: { orderId: order.id, orderNumber: order.orderNumber },
  });

  const payment = await createPayment({
    orderId: order.id,
    reference,
    amountPesewas: order.totalPesewas,
    currency: "GHS",
    authorizationUrl,
    accessCode,
  });

  return toCheckout(payment);
};
