import { formatGhs } from "../../utils/money.js";
import { notify } from "./notify.service.js";

// How long the money usually takes to arrive, by how it was paid
const ARRIVAL_TIME = {
  mobile_money: "within 1 to 3 working days",
  card: "within 5 to 10 working days",
};

const arrivalTimeFor = (channel) => ARRIVAL_TIME[channel] || "within 10 working days";

// SMS and email for one refund event; each is sent once only (dedupe key per refund)
const tellCustomer = async ({ customer, refund, event, subject, message }) => {
  await notify({
    channel: "SMS",
    to: customer.phone,
    template: `refund.${event}`,
    key: `refund:${refund.id}:${event}:sms`,
    text: message,
  });
  await notify({
    channel: "EMAIL",
    to: customer.email,
    template: `refund.${event}`,
    key: `refund:${refund.id}:${event}:email`,
    subject,
    text: message,
  });
};

// Tells the customer by SMS and email [AC-CANC-07]
export const notifyRefundStarted = async ({ customer, order, refund, channel }) => {
  await tellCustomer({
    customer,
    refund,
    event: "started",
    subject: `Refund started for order ${order.orderNumber}`,
    message: `CibusHub: your refund of ${formatGhs(refund.amountPesewas)} for order ${order.orderNumber} has started. It should reach you ${arrivalTimeFor(channel)}.`,
  });
};

export const notifyRefundProcessed = async ({ customer, order, refund }) => {
  await tellCustomer({
    customer,
    refund,
    event: "processed",
    subject: `Refund processed for order ${order.orderNumber}`,
    message: `CibusHub: your refund of ${formatGhs(refund.amountPesewas)} for order ${order.orderNumber} has been processed by the payment provider.`,
  });
};
