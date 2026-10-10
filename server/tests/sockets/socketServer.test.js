import { createServer } from "node:http";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { io as connectClient } from "socket.io-client";
import app from "../../src/app.js";
import { Address, MenuCategory, MenuItem } from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { createSocketServer } from "../../src/sockets/socketServer.js";
import { orderRoom, restaurantRoom } from "../../src/sockets/rooms.js";
import { createTestUser } from "../helpers/users.js";
import { createOwner, createTestRestaurant } from "../helpers/restaurants.js";

const FRIDAY_NOON = new Date("2026-10-09T12:00:00Z");

let httpServer;
let sockets;
let url;
const openClients = [];

// One real HTTP + Socket.IO server for the whole file, on a free port
beforeAll(async () => {
  httpServer = createServer(app);
  sockets = createSocketServer(httpServer);
  await new Promise((resolve) => httpServer.listen(0, resolve));
  url = `http://localhost:${httpServer.address().port}`;
});

afterAll(async () => {
  await sockets.close();
});

afterEach(() => {
  while (openClients.length > 0) {
    openClients.pop().disconnect();
  }
  vi.useRealTimers();
});

// Connects like a browser would: the login cookie goes in the handshake.
// Resolves with the connected socket, or rejects with the server's error message.
const connectAs = (user, cookieOverride) => {
  const cookie = cookieOverride ?? (user ? `access_token=${signAccessToken(user)}` : "");
  const client = connectClient(url, {
    transports: ["websocket"],
    extraHeaders: { cookie },
    reconnection: false,
  });
  openClients.push(client);

  return new Promise((resolve, reject) => {
    client.on("connect", () => resolve(client));
    client.on("connect_error", (error) => reject(error));
  });
};

// Asks to follow an order and waits for the server's answer
const joinOrder = (client, orderId) => {
  return new Promise((resolve) => client.emit("order:join", orderId, resolve));
};

// How many connections are in a room right now (checked on the server side)
const countInRoom = async (room) => {
  const inRoom = await sockets.io.in(room).fetchSockets();
  return inRoom.length;
};

let customer;
let owner;
let restaurant;
let order;

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(FRIDAY_NOON);

  customer = await createTestUser();
  owner = await createOwner({
    status: "ACTIVE",
    email: "owner@example.com",
    phone: "+233201112222",
  });
  restaurant = await createTestRestaurant(owner, { status: "APPROVED" });
  const category = await MenuCategory.create({ restaurantId: restaurant.id, name: "Rice" });
  const waakye = await MenuItem.create({
    restaurantId: restaurant.id,
    categoryId: category.id,
    name: "Waakye",
    pricePesewas: 3000,
  });
  const address = await Address.create({
    userId: customer.id,
    label: "HOME",
    latitude: 6.6745,
    longitude: -1.61,
  });

  const placed = await request(app)
    .post("/api/v1/customer/orders")
    .set("Cookie", `access_token=${signAccessToken(customer)}`)
    .set("Idempotency-Key", "tap-socket-1")
    .send({
      restaurantId: restaurant.id,
      addressId: address.id,
      items: [{ menuItemId: waakye.id, quantity: 1, optionIds: [], seenUnitPricePesewas: 3000 }],
    });
  order = placed.body.data;
});

describe("Socket handshake [AC-RT-01]", () => {
  it("refuses a connection without the login cookie", async () => {
    await expect(connectAs(null)).rejects.toThrow("UNAUTHENTICATED");
  });

  it("refuses a forged or broken token", async () => {
    await expect(connectAs(null, "access_token=not-a-real-token")).rejects.toThrow(
      "UNAUTHENTICATED",
    );
  });

  it("accepts a logged-in user", async () => {
    const client = await connectAs(customer);

    expect(client.connected).toBe(true);
  });
});

describe("Order rooms [AC-RT-02]", () => {
  it("lets the order's customer follow it", async () => {
    const client = await connectAs(customer);

    const answer = await joinOrder(client, order.id);

    expect(answer).toEqual({ ok: true });
    expect(await countInRoom(orderRoom(order.id))).toBe(1);
  });

  it("refuses another customer, who never enters the room", async () => {
    const stranger = await createTestUser({ email: "kofi@example.com", phone: "+233551112222" });
    const client = await connectAs(stranger);

    const answer = await joinOrder(client, order.id);

    expect(answer).toEqual({ ok: false });
    expect(await countInRoom(orderRoom(order.id))).toBe(0);
  });

  it("refuses an order id that doesn't exist", async () => {
    const client = await connectAs(customer);

    const answer = await joinOrder(client, "00000000-0000-4000-8000-000000000000");

    expect(answer).toEqual({ ok: false });
  });

  it("lets the restaurant's owner follow it, and puts them in their restaurant's room", async () => {
    const client = await connectAs(owner);

    const answer = await joinOrder(client, order.id);

    expect(answer).toEqual({ ok: true });
    expect(await countInRoom(restaurantRoom(restaurant.id))).toBe(1);
  });

  it("refuses the owner of a different restaurant", async () => {
    const otherOwner = await createOwner({
      status: "ACTIVE",
      email: "other-owner@example.com",
      phone: "+233209998888",
    });
    await createTestRestaurant(otherOwner, { status: "APPROVED", name: "Other Kitchen" });
    const client = await connectAs(otherOwner);

    const answer = await joinOrder(client, order.id);

    expect(answer).toEqual({ ok: false });
    expect(await countInRoom(restaurantRoom(restaurant.id))).toBe(0);
  });

  it("lets an admin follow any order", async () => {
    const admin = await createTestUser({
      role: "ADMIN",
      email: "admin@example.com",
      phone: "+233200000001",
    });
    const client = await connectAs(admin);

    const answer = await joinOrder(client, order.id);

    expect(answer).toEqual({ ok: true });
  });
});
