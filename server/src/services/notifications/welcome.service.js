import logger from "../../config/logger.js";
import { notify } from "./notify.service.js";
import { welcomeEmail } from "./templates/emails.js";
import { appLink } from "./templates/layout.js";

// What the welcome text says to do next, and where its link goes, per role (one short SMS)
const WELCOME_SMS = {
  CUSTOMER: ["Your account is ready. Order hot food from kitchens across Kumasi:", "/restaurants"],
  RESTAURANT_OWNER: [
    "Next, register your restaurant so our team can review it:",
    "/owner/restaurants",
  ],
  RIDER: ["Next, finish your rider application so our team can review it:", "/rider"],
};

// The welcome text and email, sent once, when the phone is first verified: that's when the
// account really exists, for every role and for Google / Apple sign-ups too. The key stops
// a second welcome ever going to the same person.
// Never throws: a message that can't be queued must not undo the verification.
export const sendWelcome = async (user) => {
  const firstName = user.fullName.split(" ")[0];
  const [nextStep, path] = WELCOME_SMS[user.role] || WELCOME_SMS.CUSTOMER;

  try {
    await notify({
      channel: "SMS",
      to: user.phone,
      template: "account.welcome",
      key: `welcome-sms:${user.id}`,
      text: `Welcome to CibusHub, ${firstName}! ${nextStep} ${appLink(path)}`,
    });
    await notify({
      channel: "EMAIL",
      to: user.email,
      template: "account.welcome",
      key: `welcome-email:${user.id}`,
      ...welcomeEmail({ firstName, role: user.role }),
    });
  } catch (error) {
    logger.error({ err: error, userId: user.id }, "Welcome message could not be queued");
  }
};
