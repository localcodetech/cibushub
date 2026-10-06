import { sendSms } from "./sms.service.js";

export const notifyPasswordChanged = async (user) => {
  await sendSms(
    user.phone,
    "Your CibusHub password was just changed. If this was not you, contact support immediately.",
  );
};
