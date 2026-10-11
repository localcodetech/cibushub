import logger from "../config/logger.js";
import { getEmitter } from "./emitter.js";
import { userRoom } from "./rooms.js";

// Closes every live connection one user has open (e.g. just suspended), on every API
// instance. Their app then has to log in again, which a suspended account can't.
// Never throws: the suspension itself is already saved.
export const disconnectUser = (userId) => {
  try {
    getEmitter().in(userRoom(userId)).disconnectSockets(true);
  } catch (error) {
    logger.warn({ err: error, userId }, "Could not close the user's live connections");
  }
};
