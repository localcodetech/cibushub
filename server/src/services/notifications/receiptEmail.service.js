import logger from "../../config/logger.js";
import { notify } from "./notify.service.js";
import { buildReceipt } from "../order/receipt.service.js";
import { buildReceiptPdf } from "../order/receiptPdf.service.js";
import { receiptEmail } from "./templates/emails.js";
import { findUserById } from "../../repositories/user.repository.js";

// The receipt as a PDF file for the email [AC-PAY-17], or none if it can't be made:
// the email itself (with the receipt written out) still goes.
const receiptAttachment = async (receipt) => {
  try {
    const pdf = await buildReceiptPdf(receipt);
    return [
      {
        filename: `CibusHub-receipt-${receipt.orderNumber}.pdf`,
        content: pdf.toString("base64"),
      },
    ];
  } catch (error) {
    logger.error({ err: error, orderId: receipt.orderId }, "Could not attach the receipt PDF");
    return [];
  }
};

// Emails the receipt once an order is paid [AC-PAY-15]. A failed email is logged, never thrown:
// the payment is already saved and must not be undone because an email could not be sent.
export const emailReceipt = async (orderId) => {
  try {
    const receipt = await buildReceipt(orderId);
    const customer = await findUserById(receipt.customerId);

    // Once per order, even if Paystack tells us twice that it was paid [AC-NOTIF-04]
    await notify({
      channel: "EMAIL",
      to: customer.email,
      template: "order.receipt",
      key: `order:${orderId}:receipt:email`,
      ...receiptEmail(receipt),
      attachments: await receiptAttachment(receipt),
    });
  } catch (error) {
    logger.error({ err: error, orderId }, "Could not send receipt email");
  }
};
