import AppError from "../../utils/AppError.js";
import { formatGhs } from "../../utils/money.js";
import { findSuccessfulPayment } from "../../repositories/payment.repository.js";
import { createRefundRecord, sumActiveRefunds } from "../../repositories/refund.repository.js";

// How much of an order's payment has not been promised back yet (0 if it was never paid)
export const refundableAmount = async (order, transaction) => {
  if (!["PAID", "PARTIALLY_REFUNDED"].includes(order.paymentStatus)) {
    return 0;
  }

  const payment = await findSuccessfulPayment(order.id, transaction);
  if (!payment) {
    return 0;
  }

  return payment.amountPesewas - (await sumActiveRefunds(order.id, transaction));
};

// Writes a refund "to-do note" (PENDING). A background job sends it to Paystack.
// The caller must have LOCKED the order in `transaction`, so two refunds for one order
// are checked one after the other, never at the same time [AC-CANC-04, AC-CANC-05]
export const requestRefund = async ({ order, amountPesewas, reason, actor, transaction }) => {
  if (!["PAID", "PARTIALLY_REFUNDED"].includes(order.paymentStatus)) {
    throw new AppError(409, "NOTHING_TO_REFUND", "This order has no payment to refund");
  }

  const payment = await findSuccessfulPayment(order.id, transaction);
  if (!payment) {
    throw new AppError(409, "NOTHING_TO_REFUND", "This order has no payment to refund");
  }

  // Never more back than was paid, counting refunds already on their way [AC-CANC-05]
  const alreadyPromised = await sumActiveRefunds(order.id, transaction);
  const stillRefundable = payment.amountPesewas - alreadyPromised;

  if (amountPesewas > stillRefundable) {
    throw new AppError(
      409,
      "REFUND_EXCEEDS_PAID",
      `At most ${formatGhs(stillRefundable)} can still be refunded for this order`,
    );
  }

  return createRefundRecord(
    {
      orderId: order.id,
      paymentId: payment.id,
      amountPesewas,
      reason,
      initiatedByUserId: actor.userId,
      initiatedByRole: actor.role,
    },
    transaction,
  );
};
