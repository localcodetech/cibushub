// The names of the Socket.IO rooms, in one place so the server and emitter never disagree.
// A room is a group of connections that receive the same events.

// Everyone allowed to follow one order: its customer, its restaurant and admins [AC-RT-02]
export const orderRoom = (orderId) => `order:${orderId}`;

// The restaurant's own connections (its dashboard), for new and changed orders [AC-RORD-01]
export const restaurantRoom = (restaurantId) => `restaurant:${restaurantId}`;

// All of one person's open tabs and devices
export const userRoom = (userId) => `user:${userId}`;

// Every admin, for problems that need a human
export const ADMINS_ROOM = "admins";
