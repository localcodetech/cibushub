import logger from "../config/logger.js";
import { getEmitter } from "./emitter.js";
import { ADMINS_ROOM } from "./rooms.js";

// Something needs an admin, e.g. a new rider application [AC-RIDER-01].
// Only a nudge to the admin screens that are open; email and SMS alerts come in Step 12.
// Never throws: the admin queue (REST) is the source of truth.
export const emitAdminAlert = (type, details) => {
  try {
    getEmitter()
      .to(ADMINS_ROOM)
      .emit("admin:alert", { type, ...details, at: new Date().toISOString() });
  } catch (error) {
    logger.warn({ err: error, type }, "Admin alert not sent");
  }
};
