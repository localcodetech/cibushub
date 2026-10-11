import logger from "../config/logger.js";
import { getEmitter } from "./emitter.js";
import { ADMINS_ROOM, orderRoom, restaurantRoom, userRoom } from "./rooms.js";

// "Order X is now PREPARING" to everyone following it [AC-RT-03, AC-RORD-01].
// Only a notice: screens then fetch the order through the REST API (the source of truth),
// so the event carries no prices, addresses or phone numbers.
// Never throws: a missed live update is fixed by the screen's next refetch.
export const emitOrderChanged = (order, fromStatus) => {
  try {
    const event = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      fromStatus: fromStatus,
      at: new Date().toISOString(),
    };

    getEmitter()
      .to(orderRoom(order.id))
      .to(restaurantRoom(order.restaurantId))
      .to(userRoom(order.customerId))
      .to(ADMINS_ROOM)
      .emit("order:updated", event);
  } catch (error) {
    logger.warn({ err: error, orderId: order.id }, "Live order update not sent");
  }
};
