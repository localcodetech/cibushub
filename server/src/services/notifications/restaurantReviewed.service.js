import { sendSms } from "./sms.service.js";

export const notifyRestaurantApproved = async (owner, restaurant) => {
  await sendSms(
    owner.phone,
    `Good news! ${restaurant.name} has been approved on CibusHub. You can now add your menu and start receiving orders.`,
  );
};

export const notifyRestaurantRejected = async (owner, restaurant) => {
  await sendSms(
    owner.phone,
    `${restaurant.name} was not approved on CibusHub. Reason: ${restaurant.rejectionReason}. Please correct the details and resubmit.`,
  );
};

export const notifyRestaurantSuspended = async (owner, restaurant, reason) => {
  await sendSms(
    owner.phone,
    `${restaurant.name} has been suspended on CibusHub and is hidden from customers. Reason: ${reason}. Contact support for help.`,
  );
};
