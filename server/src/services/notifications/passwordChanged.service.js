import { notify } from "./notify.service.js";

export const notifyPasswordChanged = async (user) => {
  await notify({
    channel: "SMS",
    to: user.phone,
    template: "account.password-changed",
    text: "Your CibusHub password was just changed. If this was not you, contact support immediately.",
  });
};
