import { notify } from "./notify.service.js";

const tellRider = (rider, template, text) =>
  notify({ channel: "SMS", to: rider.phone, template, text });

export const notifyRiderApproved = async (rider) => {
  await tellRider(
    rider,
    "rider.approved",
    "Good news! You are approved as a CibusHub rider. Open the app and go online to start receiving deliveries.",
  );
};

export const notifyRiderRejected = async (rider, reason) => {
  await tellRider(
    rider,
    "rider.rejected",
    `Your CibusHub rider application was not approved. Reason: ${reason}. Please correct it in the app and submit again.`,
  );
};

export const notifyRiderSuspended = async (rider, reason) => {
  await tellRider(
    rider,
    "rider.suspended",
    `Your CibusHub rider account has been suspended. Reason: ${reason}. Contact support for help.`,
  );
};
