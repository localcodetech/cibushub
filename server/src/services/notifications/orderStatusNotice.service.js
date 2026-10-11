import logger from "../../config/logger.js";
import { notify } from "./notify.service.js";
import { orderDeliveredEmail, orderRejectedEmail } from "./templates/emails.js";
import { findUserById } from "../../repositories/user.repository.js";
import { findRestaurantById } from "../../repositories/restaurant.repository.js";

// "2026-10-11T12:40:00Z" -> "12:40", in Ghana time
const ghanaTime = (date) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Accra",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(date));

// Which messages each new status sends to the customer [AC-NOTIF-01].
// (In-app notices come with the notification centre.) SMS stay short, with the order number,
// and never carry the delivery code or the address [AC-NOTIF-06].
const MESSAGES = {
  ACCEPTED: ({ order, restaurant }) => ({
    sms: order.estimatedReadyAt
      ? `CibusHub: ${restaurant.name} accepted order ${order.orderNumber}. It should be ready around ${ghanaTime(order.estimatedReadyAt)}.`
      : `CibusHub: ${restaurant.name} accepted order ${order.orderNumber}.`,
  }),
  REJECTED: ({ order, restaurant }) => ({
    sms: `CibusHub: sorry, ${restaurant.name} couldn't take order ${order.orderNumber}. You'll get a full refund.`,
    email: orderRejectedEmail({
      orderNumber: order.orderNumber,
      orderId: order.id,
      restaurantName: restaurant.name,
      reason: order.cancellationReason,
      totalPesewas: order.totalPesewas,
    }),
  }),
  PICKED_UP: ({ order }) => ({
    sms: `CibusHub: your rider has picked up order ${order.orderNumber} and is on the way. Have your delivery code ready.`,
  }),
  DELIVERED: ({ order, restaurant }) => ({
    email: orderDeliveredEmail({
      orderNumber: order.orderNumber,
      orderId: order.id,
      restaurantName: restaurant.name,
    }),
  }),
};

// Called once a status change is saved. Each message is sent once only: the dedupe key is
// the order + status + channel, e.g. "order:<id>:status:ACCEPTED:sms" [AC-NOTIF-04].
// Never throws: a message must never undo or break the status change.
export const notifyOrderStatus = async (order) => {
  const buildMessages = MESSAGES[order.status];
  if (!buildMessages) {
    return;
  }

  try {
    const [customer, restaurant] = await Promise.all([
      findUserById(order.customerId),
      findRestaurantById(order.restaurantId),
    ]);
    if (!customer || !restaurant) {
      return;
    }

    const { sms, email } = buildMessages({ order, restaurant });
    const template = `order.${order.status.toLowerCase()}`;
    const key = `order:${order.id}:status:${order.status}`;

    if (sms) {
      await notify({ channel: "SMS", to: customer.phone, template, key: `${key}:sms`, text: sms });
    }
    if (email) {
      await notify({
        channel: "EMAIL",
        to: customer.email,
        template,
        key: `${key}:email`,
        ...email,
      });
    }
  } catch (error) {
    logger.error({ err: error, orderId: order.id }, "Could not send order status messages");
  }
};
