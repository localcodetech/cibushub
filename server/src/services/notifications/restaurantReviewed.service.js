import { notify } from "./notify.service.js";
import { restaurantReviewedEmail } from "./templates/emails.js";

// The owner hears by SMS and email [AC-NOTIF-01]
const tellOwner = async (owner, restaurant, event, sms, reason) => {
  const template = `restaurant.${event}`;
  await notify({ channel: "SMS", to: owner.phone, template, text: sms });
  await notify({
    channel: "EMAIL",
    to: owner.email,
    template,
    ...restaurantReviewedEmail({ event, restaurantName: restaurant.name, reason }),
  });
};

export const notifyRestaurantApproved = async (owner, restaurant) => {
  await tellOwner(
    owner,
    restaurant,
    "approved",
    `Good news! ${restaurant.name} has been approved on CibusHub. You can now add your menu and start receiving orders.`,
  );
};

export const notifyRestaurantRejected = async (owner, restaurant) => {
  await tellOwner(
    owner,
    restaurant,
    "rejected",
    `${restaurant.name} was not approved on CibusHub. Reason: ${restaurant.rejectionReason}. Please correct the details and resubmit.`,
    restaurant.rejectionReason,
  );
};

export const notifyRestaurantSuspended = async (owner, restaurant, reason) => {
  await tellOwner(
    owner,
    restaurant,
    "suspended",
    `${restaurant.name} has been suspended on CibusHub and is hidden from customers. Reason: ${reason}. Contact support for help.`,
    reason,
  );
};
