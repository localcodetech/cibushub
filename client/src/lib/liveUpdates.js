import { io } from "socket.io-client";
import { queryClient } from "./queryClient";
import { refreshOnce } from "./sessionRefresh";
import { useAuthStore } from "@/store/authStore";
import { setConnectionStatus } from "@/store/connectionStore";

// Live updates from the server over Socket.IO [AC-RT-01, AC-RT-07].
//
// ONE connection for the whole app, open while someone is logged in.
// The server only says "order X changed"; pages then refetch it through the REST API,
// which stays the source of truth.

// Empty in development: Vite passes /socket.io on to the server (like /api)
const API_URL = import.meta.env.VITE_API_URL || "";

// autoConnect: false -> we decide when to connect (after login, not for guests).
// withCredentials -> the login cookie goes with the handshake: that is how the server knows us.
const socket = io(API_URL, { autoConnect: false, withCredentials: true });

// Orders this screen follows (e.g. the order page that is open), so they can be rejoined
const followedOrders = new Set();

// true once we have been connected: a later "connect" is a REconnect
let hasConnectedBefore = false;

socket.on("connect", () => {
  setConnectionStatus("connected");

  // The server forgets rooms when the connection drops: ask for them again [AC-RT-07]
  for (const orderId of followedOrders) {
    socket.emit("order:join", orderId);
  }

  // Updates sent while we were away were missed: refetch what is on screen [AC-RT-07]
  if (hasConnectedBefore) {
    queryClient.invalidateQueries();
  }
  hasConnectedBefore = true;
});

socket.on("disconnect", () => {
  // socket.active: Socket.IO will try again on its own (network drop, server restart)
  setConnectionStatus(socket.active ? "reconnecting" : "off");
});

socket.on("connect_error", async (error) => {
  // The server refused the login cookie. Usually the 15-minute cookie ran out while
  // we were offline: renew it like lib/api.js does, then try once more.
  // (Socket.IO doesn't retry a refused handshake by itself.)
  if (error.message === "UNAUTHENTICATED") {
    let renewed;
    try {
      renewed = await refreshOnce();
    } catch {
      // No internet: still offline, try again shortly
      renewed = true;
    }
    if (renewed && useAuthStore.getState().user) {
      setTimeout(() => socket.connect(), 2000);
    } else {
      setConnectionStatus("off");
    }
    return;
  }

  // Any other failure (server down, no internet): Socket.IO keeps trying on its own
  setConnectionStatus(hasConnectedBefore ? "reconnecting" : "connecting");
});

// Connect when someone logs in, disconnect when they log out.
// Called once from main.jsx; it then follows the auth store by itself.
export const startLiveUpdates = () => {
  let currentUserId = null;

  const follow = (user) => {
    const userId = user ? user.id : null;
    if (userId === currentUserId) {
      return;
    }
    currentUserId = userId;

    // A new person (or nobody): drop the old connection and what it followed
    socket.disconnect();
    followedOrders.clear();
    hasConnectedBefore = false;

    if (userId) {
      setConnectionStatus("connecting");
      socket.connect();
    } else {
      setConnectionStatus("off");
    }
  };

  follow(useAuthStore.getState().user);
  useAuthStore.subscribe((state) => follow(state.user));
};

// Follow one order's updates (the order page). Returns a function that stops following.
// The server checks we may follow it; a refused join simply brings no updates.
export const followOrder = (orderId) => {
  followedOrders.add(orderId);
  if (socket.connected) {
    socket.emit("order:join", orderId);
  }

  return () => {
    followedOrders.delete(orderId);
    if (socket.connected) {
      socket.emit("order:leave", orderId);
    }
  };
};

// Run handler(event) for every "order:updated": { orderId, orderNumber, status, fromStatus, at }.
// Returns a function that stops listening.
export const onOrderUpdated = (handler) => {
  socket.on("order:updated", handler);
  return () => socket.off("order:updated", handler);
};

// Run handler(details) for one kind of server event, e.g. "delivery:offer" for riders.
// Returns a function that stops listening.
export const onLiveEvent = (eventName, handler) => {
  socket.on(eventName, handler);
  return () => socket.off(eventName, handler);
};

// A rider's position, sent over the open connection [AC-RT-04, AC-RT-05].
// Resolves with the server's answer: { ok: true } or { ok: false, reason }.
// Not connected: resolves { ok: false, reason: "NOT_CONNECTED" } (the next one will go).
export const sendRiderLocation = (point) => {
  if (!socket.connected) {
    return Promise.resolve({ ok: false, reason: "NOT_CONNECTED" });
  }
  return new Promise((resolve) => {
    // timeout: don't wait forever for an answer on a bad network
    socket.timeout(5000).emit("rider:location", point, (error, answer) => {
      resolve(error ? { ok: false, reason: "NO_ANSWER" } : answer);
    });
  });
};
