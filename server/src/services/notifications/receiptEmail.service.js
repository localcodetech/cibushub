import logger from "../../config/logger.js";
import { sendEmail } from "./email.service.js";
import { buildReceipt, receiptAsText } from "../order/receipt.service.js";
import { findUserById } from "../../repositories/user.repository.js";

// Emails the receipt once an order is paid [AC-PAY-15]. A failed email is logged, never thrown:
// the payment is already saved and must not be undone because an email could not be sent.
export const emailReceipt = async (orderId) => {
  try {
    const receipt = await buildReceipt(orderId);
    const customer = await findUserById(receipt.customerId);

    await sendEmail(
      customer.email,
      `Your CibusHub receipt for order ${receipt.orderNumber}`,
      receiptAsText(receipt),
    );
  } catch (error) {
    logger.error({ err: error, orderId }, "Could not send receipt email");
  }
};
