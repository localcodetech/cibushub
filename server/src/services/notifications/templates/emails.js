import { formatGhs } from "../../../utils/money.js";
import {
  amountRows,
  appLink,
  button,
  codeBox,
  paragraph,
  renderEmail,
  smallPrint,
} from "./layout.js";

// Every CibusHub email, each as { subject, html, text } [AC-NOTIF-05].
// Text that came from people (names, dishes) is escaped by the layout.

// A one-time code sent by email (e.g. confirming a new email address)
//   reason: what it's for, e.g. "confirm your new email address"
export const codeEmail = ({ code, reason, minutes }) =>
  renderEmail({
    subject: `${code} is your CibusHub code`,
    preheader: `Use it to ${reason}. It expires in ${minutes} minutes.`,
    heading: "Your CibusHub code",
    blocks: [
      paragraph(`Use this code to ${reason}:`),
      codeBox(code),
      paragraph(`It expires in ${minutes} minutes.`),
      smallPrint(
        "Didn't ask for this? You can ignore this email. Never share this code with anyone, including CibusHub staff.",
      ),
    ],
  });

// The receipt, once an order is paid [AC-PAY-15]
export const receiptEmail = (receipt) => {
  const itemRows = receipt.items.map((item) => {
    const extras = item.options.length > 0 ? ` (${item.options.join(", ")})` : "";
    return [`${item.quantity} × ${item.name}${extras}`, formatGhs(item.lineTotalPesewas)];
  });
  const totals = [["Subtotal", formatGhs(receipt.subtotalPesewas)]];
  totals.push(["Delivery fee", formatGhs(receipt.deliveryFeePesewas)]);
  if (receipt.serviceFeePesewas > 0) {
    totals.push(["Service fee", formatGhs(receipt.serviceFeePesewas)]);
  }
  if (receipt.discountPesewas > 0) {
    totals.push(["Discount", "−" + formatGhs(receipt.discountPesewas)]);
  }
  totals.push(["Total paid", formatGhs(receipt.totalPesewas)]);

  const paidWith = [receipt.paymentMethod, receipt.paymentReference]
    .filter(Boolean)
    .join(" · reference ");

  return renderEmail({
    subject: `Your CibusHub receipt for order ${receipt.orderNumber}`,
    preheader: `${formatGhs(receipt.totalPesewas)} paid to ${receipt.restaurantName}. Thank you!`,
    heading: "Thanks for your order!",
    blocks: [
      paragraph(`Order ${receipt.orderNumber} from ${receipt.restaurantName}.`),
      amountRows(itemRows),
      amountRows(totals, { boldLast: true }),
      smallPrint(`Paid with ${paidWith || "Paystack"}.`),
      button("Track your order", appLink(`/customer/orders/${receipt.orderId}`)),
      smallPrint(`${receipt.restaurantName}, ${receipt.restaurantAddress}`),
    ],
  });
};

// A refund started or reached the customer [AC-CANC-07]
//   event: "started" or "processed"; arrival: e.g. "within 1 to 3 working days"
export const refundEmail = ({ event, amountPesewas, orderNumber, orderId, arrival }) => {
  const amount = formatGhs(amountPesewas);
  const isStarted = event === "started";
  return renderEmail({
    subject: isStarted
      ? `Refund started for order ${orderNumber}`
      : `Refund processed for order ${orderNumber}`,
    preheader: isStarted
      ? `${amount} is on its way back to you.`
      : `${amount} has been sent back by the payment provider.`,
    heading: isStarted ? "Your refund has started" : "Your refund has been processed",
    blocks: [
      paragraph(
        isStarted
          ? `We've started a refund of ${amount} for order ${orderNumber}. It should reach you ${arrival}.`
          : `The payment provider has processed your refund of ${amount} for order ${orderNumber}.`,
      ),
      button("View the order", appLink(`/customer/orders/${orderId}`)),
      smallPrint("Questions about a refund? Reply to this email or contact our support team."),
    ],
  });
};

// Sent to the OLD address after an email change, in case it wasn't them
export const emailChangedEmail = ({ newEmail }) =>
  renderEmail({
    subject: "Your CibusHub email was changed",
    preheader: "If this wasn't you, contact us now.",
    heading: "Your email was changed",
    blocks: [
      paragraph(`The email on your CibusHub account was just changed to ${newEmail}.`),
      paragraph("If this was you, there's nothing to do."),
      smallPrint("If this wasn't you, contact CibusHub support straight away."),
    ],
  });

// The restaurant said no, or didn't answer in time [AC-NOTIF-01, AC-RORD-03, AC-RORD-04]
//   reason: what the restaurant typed (the customer sees it), or "RESTAURANT_TIMEOUT"
export const orderRejectedEmail = ({ orderNumber, orderId, restaurantName, reason, totalPesewas }) => {
  const why =
    reason === "RESTAURANT_TIMEOUT"
      ? `${restaurantName} didn't respond in time.`
      : `${restaurantName} couldn't take it. Their reason: "${reason}"`;
  return renderEmail({
    subject: `Order ${orderNumber} couldn't go ahead`,
    preheader: `Sorry! Your ${formatGhs(totalPesewas)} is being refunded in full.`,
    heading: "Sorry, your order couldn't go ahead",
    blocks: [
      paragraph(`Order ${orderNumber}: ${why}`),
      paragraph(
        `You'll get a full refund of ${formatGhs(totalPesewas)}. We'll let you know when it starts.`,
      ),
      button("Find another restaurant", appLink("/restaurants")),
      smallPrint(`Order details: ${appLink(`/customer/orders/${orderId}`)}`),
    ],
  });
};

// The food reached the customer [AC-NOTIF-01]
export const orderDeliveredEmail = ({ orderNumber, orderId, restaurantName }) =>
  renderEmail({
    subject: `Order ${orderNumber} was delivered`,
    preheader: `Your food from ${restaurantName} has arrived. Enjoy your meal!`,
    heading: "Your food has arrived",
    blocks: [
      paragraph(`Order ${orderNumber} from ${restaurantName} was delivered. Enjoy your meal!`),
      button("View your order", appLink(`/customer/orders/${orderId}`)),
      smallPrint("Something wrong with your order? Reply to this email and we'll help."),
    ],
  });
