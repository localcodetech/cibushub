import { notify } from "./notify.service.js";
import { riderReviewedEmail } from "./templates/emails.js";

// The rider hears by SMS and email [AC-NOTIF-01]
const tellRider = async (rider, event, sms, reason) => {
  const template = `rider.${event}`;
  await notify({ channel: "SMS", to: rider.phone, template, text: sms });
  await notify({
    channel: "EMAIL",
    to: rider.email,
    template,
    ...riderReviewedEmail({ event, reason }),
  });
};

export const notifyRiderApproved = async (rider) => {
  await tellRider(
    rider,
    "approved",
    "Good news! You are approved as a CibusHub rider. Open the app and go online to start receiving deliveries.",
  );
};

export const notifyRiderRejected = async (rider, reason) => {
  await tellRider(
    rider,
    "rejected",
    `Your CibusHub rider application was not approved. Reason: ${reason}. Please correct it in the app and submit again.`,
    reason,
  );
};

export const notifyRiderSuspended = async (rider, reason) => {
  await tellRider(
    rider,
    "suspended",
    `Your CibusHub rider account has been suspended. Reason: ${reason}. Contact support for help.`,
    reason,
  );
};
