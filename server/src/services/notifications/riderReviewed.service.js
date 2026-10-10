import { sendSms } from "./sms.service.js";

export const notifyRiderApproved = async (rider) => {
  await sendSms(
    rider.phone,
    "Good news! You are approved as a CibusHub rider. Open the app and go online to start receiving deliveries.",
  );
};

export const notifyRiderRejected = async (rider, reason) => {
  await sendSms(
    rider.phone,
    `Your CibusHub rider application was not approved. Reason: ${reason}. Please correct it in the app and submit again.`,
  );
};

export const notifyRiderSuspended = async (rider, reason) => {
  await sendSms(
    rider.phone,
    `Your CibusHub rider account has been suspended. Reason: ${reason}. Contact support for help.`,
  );
};
