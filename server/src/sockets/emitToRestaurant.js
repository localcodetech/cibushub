import logger from "../config/logger.js";
import { getEmitter } from "./emitter.js";
import { restaurantRoom } from "./rooms.js";

// A live message to a restaurant's screens (its owner joins this room on connect).
// Never throws: the board's next refetch corrects it.
export const emitToRestaurant = (restaurantId, event, details) => {
  try {
    getEmitter()
      .to(restaurantRoom(restaurantId))
      .emit(event, { ...details, at: new Date().toISOString() });
  } catch (error) {
    logger.warn({ err: error, restaurantId, event }, "Live restaurant message not sent");
  }
};
