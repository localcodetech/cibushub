import logger from "../../config/logger.js";
import { notify } from "./notify.service.js";
import { notifyAdminsInApp, notifyInApp } from "./inApp.service.js";
import { orderDeliveredEmail, orderRejectedEmail } from "./templates/emails.js";
import { findUserById } from "../../repositories/user.repository.js";
import { findRestaurantById } from "../../repositories/restaurant.repository.js";
import { findDeliveryByOrderId } from "../../repositories/delivery.repository.js";
import { findRiderProfileById } from "../../repositories/rider.repository.js";

// "2026-10-11T12:40:00Z" -> "12:40", in Ghana time
const ghanaTime = (date) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Accra",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(date));

// Where tapping an in-app notification goes, for each person
const customerLink = (order) => `/customer/orders/${order.id}`;
const OWNER_LINK = "/owner";
const RIDER_LINK = "/rider/delivery";

// Which messages each new status sends, and to whom [AC-NOTIF-01]:
//   sms, email: the customer
//   inApp:      { customer, owner, rider, admins }, each { title, body, link }
// SMS stay short, with the order number, and never carry the delivery code or the
// address [AC-NOTIF-06].
const MESSAGES = {
  PAID: ({ order }) => ({
    inApp: {
      customer: {
        title: "Order paid",
        body: `We've received your payment for order ${order.orderNumber}. Waiting for the restaurant to accept.`,
        link: customerLink(order),
      },
      owner: {
        title: "New order",
        body: `Order ${order.orderNumber} is paid. Accept or reject it within 5 minutes.`,
        link: OWNER_LINK,
      },
    },
  }),
  ACCEPTED: ({ order, restaurant }) => {
    const readyAround = order.estimatedReadyAt
      ? ` It should be ready around ${ghanaTime(order.estimatedReadyAt)}.`
      : "";
    return {
      sms: `CibusHub: ${restaurant.name} accepted order ${order.orderNumber}.${readyAround}`,
      inApp: {
        customer: {
          title: "Order accepted",
          body: `${restaurant.name} accepted order ${order.orderNumber}.${readyAround}`,
          link: customerLink(order),
        },
      },
    };
  },
  REJECTED: ({ order, restaurant }) => ({
    sms: `CibusHub: sorry, ${restaurant.name} couldn't take order ${order.orderNumber}. You'll get a full refund.`,
    email: orderRejectedEmail({
      orderNumber: order.orderNumber,
      orderId: order.id,
      restaurantName: restaurant.name,
      reason: order.cancellationReason,
      totalPesewas: order.totalPesewas,
    }),
    inApp: {
      customer: {
        title: "Order couldn't go ahead",
        body: `Sorry, ${restaurant.name} couldn't take order ${order.orderNumber}. You'll get a full refund.`,
        link: customerLink(order),
      },
      admins: {
        title:
          order.cancellationReason === "RESTAURANT_TIMEOUT" ? "Order timed out" : "Order rejected",
        body:
          order.cancellationReason === "RESTAURANT_TIMEOUT"
            ? `${restaurant.name} didn't answer order ${order.orderNumber} in time.`
            : `${restaurant.name} rejected order ${order.orderNumber}: ${order.cancellationReason}`,
        link: "/admin",
      },
    },
  }),
  RIDER_ASSIGNED: ({ order }) => ({
    inApp: {
      customer: {
        title: "Rider on the way to the restaurant",
        body: `A rider is collecting order ${order.orderNumber}.`,
        link: customerLink(order),
      },
      owner: {
        title: "Rider assigned",
        body: `A rider is coming to collect order ${order.orderNumber}.`,
        link: OWNER_LINK,
      },
      rider: {
        title: "Food is ready",
        body: `Order ${order.orderNumber} is ready. Head to the restaurant to collect it.`,
        link: RIDER_LINK,
      },
    },
  }),
  PICKED_UP: ({ order }) => ({
    sms: `CibusHub: your rider has picked up order ${order.orderNumber} and is on the way. Have your delivery code ready.`,
    inApp: {
      customer: {
        title: "On the way",
        body: `Your rider has picked up order ${order.orderNumber}. Have your delivery code ready.`,
        link: customerLink(order),
      },
      owner: {
        title: "Order collected",
        body: `The rider collected order ${order.orderNumber}.`,
        link: OWNER_LINK,
      },
    },
  }),
  DELIVERED: ({ order, restaurant }) => ({
    email: orderDeliveredEmail({
      orderNumber: order.orderNumber,
      orderId: order.id,
      restaurantName: restaurant.name,
    }),
    inApp: {
      customer: {
        title: "Delivered",
        body: `Order ${order.orderNumber} from ${restaurant.name} was delivered. Enjoy your meal!`,
        link: customerLink(order),
      },
      owner: {
        title: "Order delivered",
        body: `Order ${order.orderNumber} reached the customer.`,
        link: OWNER_LINK,
      },
      rider: {
        title: "Delivery complete",
        body: `Order ${order.orderNumber} is delivered. Nice work!`,
        link: "/rider/earnings",
      },
    },
  }),
};

// The rider carrying this order (if one is assigned yet)
const findRiderUserId = async (orderId) => {
  const delivery = await findDeliveryByOrderId(orderId);
  if (!delivery?.riderProfileId) {
    return null;
  }
  const profile = await findRiderProfileById(delivery.riderProfileId);
  return profile?.userId ?? null;
};

// Called once a status change is saved. Each message is sent once only: the dedupe key is
// the order + status + channel (+ who), e.g. "order:<id>:status:ACCEPTED:sms" [AC-NOTIF-04].
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

    const { sms, email, inApp = {} } = buildMessages({ order, restaurant });
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

    // In the app: one per person, each once [AC-NOTIF-07]
    const inAppFor = async (userId, who, message) => {
      if (userId && message) {
        await notifyInApp({
          userId,
          type: template,
          key: `${key}:in-app:${who}`,
          ...message,
        });
      }
    };
    await inAppFor(customer.id, "customer", inApp.customer);
    await inAppFor(restaurant.ownerId, "owner", inApp.owner);
    if (inApp.rider) {
      await inAppFor(await findRiderUserId(order.id), "rider", inApp.rider);
    }
    if (inApp.admins) {
      await notifyAdminsInApp({ type: template, key, ...inApp.admins });
    }
  } catch (error) {
    logger.error({ err: error, orderId: order.id }, "Could not send order status messages");
  }
};
