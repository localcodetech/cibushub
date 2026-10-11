import logger from "../config/logger.js";
import { getEmitter } from "./emitter.js";
import { orderRoom } from "./rooms.js";

// A live message to everyone following one order (its customer, restaurant, rider, admins:
// the room only lets them in [AC-RT-02]). Never throws.
export const emitToOrder = (orderId, event, details) => {
  try {
    getEmitter()
      .to(orderRoom(orderId))
      .emit(event, { orderId, ...details });
  } catch (error) {
    logger.warn({ err: error, orderId, event }, "Live order message not sent");
  }
};
