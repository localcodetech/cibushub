import { notify } from "./notify.service.js";

const tellOwner = (owner, template, text) =>
  notify({ channel: "SMS", to: owner.phone, template, text });

export const notifyRestaurantApproved = async (owner, restaurant) => {
  await tellOwner(
    owner,
    "restaurant.approved",
    `Good news! ${restaurant.name} has been approved on CibusHub. You can now add your menu and start receiving orders.`,
  );
};

export const notifyRestaurantRejected = async (owner, restaurant) => {
  await tellOwner(
    owner,
    "restaurant.rejected",
    `${restaurant.name} was not approved on CibusHub. Reason: ${restaurant.rejectionReason}. Please correct the details and resubmit.`,
  );
};

export const notifyRestaurantSuspended = async (owner, restaurant, reason) => {
  await tellOwner(
    owner,
    "restaurant.suspended",
    `${restaurant.name} has been suspended on CibusHub and is hidden from customers. Reason: ${reason}. Contact support for help.`,
  );
};
