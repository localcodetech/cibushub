import logger from "../../config/logger.js";
import { notify } from "./notify.service.js";
import { findActiveAdmins } from "../../repositories/user.repository.js";

// Emails one alert to every active admin [AC-NOTIF-01].
//   type:  what kind of alert, for the log, e.g. "NO_RIDER_FOUND"
//   key:   the event, e.g. "delivery:<id>:no-rider"; each admin gets it once [AC-NOTIF-04]
//   email: { subject, html, text } from a template
// Never throws: an alert must never break the work that raised it.
export const emailAdmins = async ({ type, key, email }) => {
  try {
    const admins = await findActiveAdmins();
    for (const admin of admins) {
      await notify({
        channel: "EMAIL",
        to: admin.email,
        template: `admin.${type.toLowerCase()}`,
        key: `${key}:admin:${admin.id}:email`,
        ...email,
      });
    }
  } catch (error) {
    logger.error({ err: error, type }, "Could not email the admins");
  }
};
