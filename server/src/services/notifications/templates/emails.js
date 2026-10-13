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
      smallPrint(`Paid with ${paidWith || "Paystack"}. A PDF copy of this receipt is attached.`),
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

// The last message we send to a deleted account [AC-CUST-11]
export const accountDeletedEmail = () =>
  renderEmail({
    subject: "Your CibusHub account was deleted",
    preheader: "Your personal details have been removed.",
    heading: "Your account was deleted",
    blocks: [
      paragraph(
        "Your CibusHub account and your personal details (name, phone, email, addresses and photo) have been removed.",
      ),
      paragraph(
        "Records of past orders and payments are kept for tax and accounting, without your name or contact details.",
      ),
      paragraph("You're welcome to sign up again at any time."),
      smallPrint("If you didn't ask for this, contact CibusHub support straight away."),
    ],
  });

// The restaurant said no, or didn't answer in time [AC-NOTIF-01, AC-RORD-03, AC-RORD-04]
//   reason: what the restaurant typed (the customer sees it), or "RESTAURANT_TIMEOUT"
export const orderRejectedEmail = ({
  orderNumber,
  orderId,
  restaurantName,
  reason,
  totalPesewas,
}) => {
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

// An admin approved, rejected or suspended a restaurant [AC-NOTIF-01, AC-ADM-03]
//   event: "approved" | "rejected" | "suspended"; reason: what the admin typed
export const restaurantReviewedEmail = ({ event, restaurantName, reason }) => {
  const content = {
    approved: {
      subject: `${restaurantName} is approved on CibusHub`,
      heading: "You're approved!",
      lines: [`${restaurantName} has been approved. Add your menu and start receiving orders.`],
      action: ["Open your dashboard", "/owner"],
    },
    rejected: {
      subject: `${restaurantName} was not approved yet`,
      heading: "Your restaurant needs a few changes",
      lines: [
        `${restaurantName} was not approved. Reason: ${reason}`,
        "Please correct the details and submit again.",
      ],
      action: ["Fix and resubmit", "/owner"],
    },
    suspended: {
      subject: `${restaurantName} has been suspended`,
      heading: "Your restaurant is suspended",
      lines: [
        `${restaurantName} is hidden from customers for now. Reason: ${reason}`,
        "Reply to this email or contact support for help.",
      ],
    },
  }[event];

  return renderEmail({
    subject: content.subject,
    preheader: content.lines[0],
    heading: content.heading,
    blocks: [
      ...content.lines.map(paragraph),
      ...(content.action ? [button(content.action[0], appLink(content.action[1]))] : []),
    ],
  });
};

// An admin approved, rejected or suspended a rider [AC-NOTIF-01, AC-RIDER-02]
export const riderReviewedEmail = ({ event, reason }) => {
  const content = {
    approved: {
      subject: "You're approved as a CibusHub rider",
      heading: "You're approved!",
      lines: ["Open the app and go online to start receiving deliveries."],
      action: ["Go online", "/rider"],
    },
    rejected: {
      subject: "Your rider application needs a few changes",
      heading: "Your application needs a few changes",
      lines: [
        `Your rider application was not approved. Reason: ${reason}`,
        "Please correct it in the app and submit again.",
      ],
      action: ["Fix and resubmit", "/rider/apply"],
    },
    suspended: {
      subject: "Your CibusHub rider account is suspended",
      heading: "Your rider account is suspended",
      lines: [
        `You can't take deliveries for now. Reason: ${reason}`,
        "Reply to this email or contact support for help.",
      ],
    },
  }[event];

  return renderEmail({
    subject: content.subject,
    preheader: content.lines[0],
    heading: content.heading,
    blocks: [
      ...content.lines.map(paragraph),
      ...(content.action ? [button(content.action[0], appLink(content.action[1]))] : []),
    ],
  });
};

// Admin alert: no rider took a paid order for 10 minutes [AC-NOTIF-01, AC-ASSIGN-06]
export const noRiderFoundEmail = ({ orderNumber }) =>
  renderEmail({
    subject: `No rider found for order ${orderNumber}`,
    preheader: "Nobody has accepted this delivery for 10 minutes.",
    heading: "No rider found",
    blocks: [
      paragraph(`Order ${orderNumber} has been waiting 10 minutes and no rider has accepted it.`),
      paragraph("Please assign a rider by hand or contact the customer."),
      button("Open the admin dashboard", appLink("/admin")),
    ],
  });

// Admin alert: Paystack says a different amount was paid than the order total [AC-NOTIF-01, AC-PAY-06]
//   received: in pesewas (or the smallest unit of `currency`)
export const paymentMismatchEmail = ({ reference, orderNumber, expected, received, currency }) =>
  renderEmail({
    subject: `Payment amount mismatch on order ${orderNumber}`,
    preheader: "The order was NOT marked paid. Please check it in Paystack.",
    heading: "Payment amount doesn't match",
    blocks: [
      paragraph(`Paystack payment ${reference} doesn't match order ${orderNumber}.`),
      amountRows([
        ["Order total", formatGhs(expected)],
        ["Paystack says", currency === "GHS" ? formatGhs(received) : `${currency} ${received}`],
      ]),
      paragraph("The order was NOT marked paid. Please check the payment in Paystack."),
      button("Open the admin dashboard", appLink("/admin")),
    ],
  });

// 2700 seconds -> "45 min"; null -> "no data"
const minutesText = (seconds) => (seconds === null ? "no data" : Math.round(seconds / 60) + " min");
const percentText = (percent) => (percent === null ? "no data" : percent + "%");

// Admin: the day in numbers, sent at 23:59 Ghana time [AC-JOB-02]
//   dayLabel: e.g. "Fri, 9 Oct 2026"; analytics: that day from the admin analytics;
//   openAlerts: how many alerts still need someone (from the dashboard)
export const dailySummaryEmail = ({ dayLabel, analytics, openAlerts }) => {
  const { totals, operations, topRestaurants } = analytics;
  const top = topRestaurants
    .slice(0, 3)
    .map((restaurant) => [
      `${restaurant.name} (${restaurant.orders})`,
      formatGhs(restaurant.customerPaidPesewas),
    ]);

  const ordersText = `${totals.orders} ${totals.orders === 1 ? "order" : "orders"}`;

  return renderEmail({
    subject: `CibusHub today: ${ordersText}, ${formatGhs(totals.customerPaidPesewas)}`,
    preheader: `${dayLabel}: ${ordersText} paid, CibusHub kept ${formatGhs(totals.cibushubPesewas)}.`,
    heading: `Your day: ${dayLabel}`,
    blocks: [
      amountRows([
        ["Paid orders", String(totals.orders)],
        ["Customers paid (after refunds)", formatGhs(totals.customerPaidPesewas)],
        ["CibusHub kept", formatGhs(totals.cibushubPesewas)],
      ]),
      amountRows([
        ["Restaurants accepted in", minutesText(operations.averageSeconds.accept)],
        ["Paid to delivered", minutesText(operations.averageSeconds.total)],
        ["Rejected by restaurants", percentText(operations.rejectedPercent)],
        ["Cancelled after paying", percentText(operations.cancelledPercent)],
      ]),
      ...(top.length > 0 ? [paragraph("Top restaurants today:"), amountRows(top)] : []),
      paragraph(
        openAlerts === 0
          ? "Nothing needs attention right now."
          : `${openAlerts} ${openAlerts === 1 ? "alert needs" : "alerts need"} attention on the dashboard.`,
      ),
      button("Open the admin dashboard", appLink("/admin")),
      smallPrint("Counts orders paid from midnight to 23:59 Ghana time. Rules: docs/analytics.md."),
    ],
  });
};
