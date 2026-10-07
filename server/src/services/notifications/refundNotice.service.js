import { formatGhs } from "../../utils/money.js";
import { sendSms } from "./sms.service.js";
import { sendEmail } from "./email.service.js";

// How long the money usually takes to arrive, by how it was paid
const ARRIVAL_TIME = {
  mobile_money: "within 1 to 3 working days",
  card: "within 5 to 10 working days",
};

const arrivalTimeFor = (channel) => ARRIVAL_TIME[channel] || "within 10 working days";

// Tells the customer by SMS and email [AC-CANC-07]
export const notifyRefundStarted = async ({ customer, order, refund, channel }) => {
  const message = `CibusHub: your refund of ${formatGhs(refund.amountPesewas)} for order ${order.orderNumber} has started. It should reach you ${arrivalTimeFor(channel)}.`;

  await sendSms(customer.phone, message);
  await sendEmail(customer.email, `Refund started for order ${order.orderNumber}`, message);
};

export const notifyRefundProcessed = async ({ customer, order, refund }) => {
  const message = `CibusHub: your refund of ${formatGhs(refund.amountPesewas)} for order ${order.orderNumber} has been processed by the payment provider.`;

  await sendSms(customer.phone, message);
  await sendEmail(customer.email, `Refund processed for order ${order.orderNumber}`, message);
};
