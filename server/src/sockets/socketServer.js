import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { parseCookie } from "cookie";
import env from "../config/env/env.js";
import logger from "../config/logger.js";
import redis from "../config/redis.js";
import { ACCESS_COOKIE } from "../utils/auth/cookies.js";
import { verifyAccessToken } from "../utils/auth/tokens.js";
import { findUserById } from "../repositories/user.repository.js";
import { findRestaurantsByOwner } from "../repositories/restaurant.repository.js";
import { findOrderById } from "../repositories/order.repository.js";
import { recordRiderLocation } from "../services/rider/riderPresence.service.js";
import { findRiderProfileByUserId } from "../repositories/rider.repository.js";
import { findActiveDeliveryForRider } from "../repositories/delivery.repository.js";
import { ADMINS_ROOM, orderRoom, restaurantRoom, userRoom } from "./rooms.js";

// Live updates over Socket.IO [AC-RT-01, AC-RT-02].
// Sockets only say "something changed"; the screens then ask the REST API for the real data.

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

// Handshake check: the same login cookie as the REST API. No valid login, no connection [AC-RT-01]
const authenticateSocket = async (socket, next) => {
  try {
    const cookies = parseCookie(socket.handshake.headers.cookie || "");
    const accessToken = cookies[ACCESS_COOKIE];
    if (!accessToken) {
      return next(new Error("UNAUTHENTICATED"));
    }

    const payload = verifyAccessToken(accessToken);
    const user = await findUserById(payload.sub);
    if (!user || user.status === "SUSPENDED") {
      return next(new Error("UNAUTHENTICATED"));
    }

    // Kept on the connection for the room checks below
    socket.data.user = { id: user.id, role: user.role };
    return next();
  } catch {
    // An expired or forged token: the client renews its cookie and connects again
    return next(new Error("UNAUTHENTICATED"));
  }
};

// May this user follow this order? Its customer, its restaurant's owner, its rider
// (while carrying it), or an admin [AC-RT-02].
export const canFollowOrder = async (user, orderId) => {
  const order = await findOrderById(orderId);
  if (!order) {
    return false;
  }
  if (ADMIN_ROLES.includes(user.role)) {
    return true;
  }
  if (user.role === "CUSTOMER") {
    return order.customerId === user.id;
  }
  if (user.role === "RESTAURANT_OWNER") {
    const restaurants = await findRestaurantsByOwner(user.id);
    return restaurants.some((restaurant) => restaurant.id === order.restaurantId);
  }
  if (user.role === "RIDER") {
    const profile = await findRiderProfileByUserId(user.id);
    const delivery = profile ? await findActiveDeliveryForRider(profile.id) : null;
    return Boolean(delivery) && delivery.orderId === order.id;
  }
  return false;
};

// Rooms joined automatically on connect, from the user's role
const joinOwnRooms = async (socket) => {
  const user = socket.data.user;
  socket.join(userRoom(user.id));

  if (ADMIN_ROLES.includes(user.role)) {
    socket.join(ADMINS_ROOM);
  }

  // An owner's dashboard hears about every order of every restaurant they own
  if (user.role === "RESTAURANT_OWNER") {
    const restaurants = await findRestaurantsByOwner(user.id);
    for (const restaurant of restaurants) {
      socket.join(restaurantRoom(restaurant.id));
    }
  }
};

// The events a connected screen can send
// (Listeners first, then the async room setup, so an early "order:join" is never missed.)
const handleConnection = async (socket) => {
  // "Let me follow order X": allowed only after the server checks [AC-RT-02].
  // reply is the acknowledgement callback: reply({ ok: true }) or reply({ ok: false })
  socket.on("order:join", async (orderId, reply) => {
    const answer = typeof reply === "function" ? reply : () => {};
    try {
      if (typeof orderId !== "string" || !(await canFollowOrder(socket.data.user, orderId))) {
        // Refused attempts are logged: someone may be probing other people's orders
        logger.warn({ userId: socket.data.user.id, orderId }, "Refused to join an order room");
        return answer({ ok: false });
      }
      socket.join(orderRoom(orderId));
      return answer({ ok: true });
    } catch (error) {
      logger.error({ err: error, orderId }, "Order room join failed");
      return answer({ ok: false });
    }
  });

  socket.on("order:leave", (orderId) => {
    if (typeof orderId === "string") {
      socket.leave(orderRoom(orderId));
    }
  });

  // A rider's phone sends its position every 5 to 10 seconds while online [AC-RT-04, AC-RT-05].
  // The answer says whether it was kept: { ok: true } or { ok: false, reason }.
  if (socket.data.user.role === "RIDER") {
    socket.on("rider:location", async (point, reply) => {
      const answer = typeof reply === "function" ? reply : () => {};
      try {
        answer(await recordRiderLocation(socket.data.user.id, point));
      } catch (error) {
        logger.error({ err: error, userId: socket.data.user.id }, "Rider location failed");
        answer({ ok: false, reason: "ERROR" });
      }
    });
  }

  await joinOwnRooms(socket);
};

// Attaches Socket.IO to the API's HTTP server (the same port, so the same cookies)
export const createSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: env.CLIENT_URL, credentials: true },
  });

  // Redis adapter: events reach every API instance, and the worker can emit too [AC-RT-10]
  const publisher = redis.duplicate();
  const subscriber = redis.duplicate();
  io.adapter(createAdapter(publisher, subscriber));

  io.use(authenticateSocket);
  io.on("connection", (socket) => {
    handleConnection(socket).catch((error) => {
      logger.error({ err: error }, "Socket connection setup failed");
      socket.disconnect(true);
    });
  });

  // For graceful shutdown: io.close() also stops the HTTP server, then the extra Redis connections
  const close = async () => {
    await io.close();
    await publisher.quit();
    await subscriber.quit();
  };

  return { io, close };
};
