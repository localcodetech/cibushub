import logger from "../config/logger.js";
import { getEmitter } from "./emitter.js";
import { userRoom } from "./rooms.js";

// A live message to every screen one user has open (e.g. "you were taken offline").
// Works from the API and the worker. Never throws: the screen's next fetch corrects it.
export const emitToUser = (userId, event, details) => {
  try {
    getEmitter()
      .to(userRoom(userId))
      .emit(event, { ...details, at: new Date().toISOString() });
  } catch (error) {
    logger.warn({ err: error, userId, event }, "Live message not sent");
  }
};
