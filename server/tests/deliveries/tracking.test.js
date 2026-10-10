import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { Delivery, RiderProfile } from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { saveLatestLocation } from "../../src/services/rider/riderLocationStore.js";
import { recordRiderLocation } from "../../src/services/rider/riderPresence.service.js";
import { canFollowOrder } from "../../src/sockets/socketServer.js";
import { deliveryCodeFor } from "../../src/utils/delivery/deliveryCode.js";
import { etaMinutes } from "../../src/utils/delivery/eta.js";
import { createTestUser } from "../helpers/users.js";
import { createPaidOrder } from "../helpers/orders.js";

vi.mock("../../src/sockets/emitToUser.js", () => ({ emitToUser: vi.fn() }));
vi.mock("../../src/sockets/emitAdminAlert.js", () => ({ emitAdminAlert: vi.fn() }));
vi.mock("../../src/sockets/emitToOrder.js", () => ({ emitToOrder: vi.fn() }));
const { emitToOrder } = await import("../../src/sockets/emitToOrder.js");

const SATURDAY_NOON = new Date("2026-10-10T12:00:00Z");
// The restaurant in createPaidOrder is at 6.6885, -1.6244 (Adum); the customer ~2 km away
const AT_RESTAURANT = { latitude: 6.6886, longitude: -1.6244 };
const ONE_KM_AWAY = { latitude: 6.6975, longitude: -1.6244 };

let order;
let owner;
let customer;
let rider;
let profile;

const as = (user) => ({
  get: (path) =>
    request(app)
      .get(path)
      .set("Cookie", `access_token=${signAccessToken(user)}`),
  post: (path, body) =>
    request(app)
      .post(path)
      .set("Cookie", `access_token=${signAccessToken(user)}`)
      .send(body),
});
// The rider was last seen 10 s ago at `point` (so the next real update is plausible)
const riderWasAt = (point) =>
  saveLatestLocation(profile.id, point, Date.now() - 10000, Date.now() - 10000);
const tracking = (user = customer) => as(user).get(`/api/v1/customer/orders/${order.id}/tracking`);
const foodIsReady = async () => {
  await as(owner).post(`/api/v1/owner/orders/${order.id}/preparing`);
  await as(owner).post(`/api/v1/owner/orders/${order.id}/ready`);
};
const pickUp = () => as(rider).post("/api/v1/rider/deliveries/current/pickup");
const deliver = async () => {
  const delivery = await Delivery.findOne({ where: { orderId: order.id } });
  return as(rider).post("/api/v1/rider/deliveries/current/complete", {
    code: deliveryCodeFor(delivery.id),
  });
};
const locationSentToOrder = () =>
  emitToOrder.mock.calls.filter(([, event]) => event === "rider:location");

beforeEach(async () => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(SATURDAY_NOON);
  ({ order, owner, customer } = await createPaidOrder());
  vi.useRealTimers();
  await as(owner).post(`/api/v1/owner/orders/${order.id}/accept`, { prepTimeMinutes: 20 });

  rider = await createTestUser({
    role: "RIDER",
    fullName: "Kwame Mensah",
    email: "kwame.rider@example.com",
    phone: "+233241110001",
  });
  profile = await RiderProfile.create({
    userId: rider.id,
    vehicleType: "MOTORBIKE",
    plateNumber: "M-21-GR 1001",
    ghanaCardNumber: "GHA-000000001-1",
    status: "APPROVED",
    isOnline: true,
  });
  await riderWasAt(ONE_KM_AWAY);

  const admin = await createTestUser({
    role: "ADMIN",
    email: "admin@example.com",
    phone: "+233200000001",
  });
  await as(admin).post(`/api/v1/admin/orders/${order.id}/rider`, {
    riderProfileId: profile.id,
    reason: "Rider is close to the restaurant",
  });
});

describe("Live rider location [AC-RT-04, AC-RT-09]", () => {
  it("is not shared while the food is still cooking", async () => {
    await recordRiderLocation(rider.id, ONE_KM_AWAY);

    expect(locationSentToOrder()).toHaveLength(0);
    const response = await tracking();
    expect(response.body.data).toMatchObject({
      isTracked: false,
      rider: null,
      riderLocation: null,
    });
  });

  it("is sent to the order's room once the rider is assigned and the food is ready", async () => {
    await foodIsReady();

    const answer = await recordRiderLocation(rider.id, ONE_KM_AWAY);

    expect(answer).toEqual({ ok: true });
    expect(emitToOrder).toHaveBeenCalledWith(
      order.id,
      "rider:location",
      expect.objectContaining({ latitude: ONE_KM_AWAY.latitude, longitude: ONE_KM_AWAY.longitude }),
    );
  });

  it("stops once the order is delivered", async () => {
    await foodIsReady();
    await riderWasAt(AT_RESTAURANT);
    await pickUp();
    await deliver();
    vi.clearAllMocks();

    await recordRiderLocation(rider.id, AT_RESTAURANT);

    expect(locationSentToOrder()).toHaveLength(0);
    const response = await tracking();
    expect(response.body.data).toMatchObject({
      status: "DELIVERED",
      isTracked: false,
      rider: null,
      riderLocation: null,
    });
  });
});

describe("Tracking view [AC-RT-04, AC-MAP-01, AC-MAP-03]", () => {
  it("shows the rider (no phone), where they are, and an ETA via the restaurant", async () => {
    await foodIsReady();

    const response = await tracking();

    expect(response.status).toBe(200);
    const view = response.body.data;
    expect(view.isTracked).toBe(true);
    expect(view.rider).toEqual({
      firstName: "Kwame",
      photoUrl: null,
      vehicleType: "MOTORBIKE",
      plateNumber: "M-21-GR 1001",
    });
    expect(view.riderLocation).toMatchObject(ONE_KM_AWAY);
    expect(view.etaMinutes).toBe(
      etaMinutes([ONE_KM_AWAY, view.restaurant, view.dropoff], "MOTORBIKE"),
    );
    expect(view.etaBasis).toBe("STRAIGHT_LINE");
  });

  it("after pickup, the ETA is straight to the customer", async () => {
    await foodIsReady();
    await riderWasAt(AT_RESTAURANT);
    await pickUp();

    const view = (await tracking()).body.data;

    expect(view.status).toBe("PICKED_UP");
    expect(view.etaMinutes).toBe(etaMinutes([AT_RESTAURANT, view.dropoff], "MOTORBIKE"));
  });

  it("is only for the order's own customer", async () => {
    const stranger = await createTestUser({ email: "kofi@example.com", phone: "+233201234567" });

    const response = await tracking(stranger);

    expect(response.status).toBe(404);
  });

  it("works out minutes from a 5 km straight line on a motorbike", () => {
    // 5 km x 1.4 (winding roads) at 25 km/h = 16.8 min -> 17
    const fiveKmNorth = { latitude: 6.6885 + 5 / 111.32, longitude: -1.6244 };
    expect(etaMinutes([{ latitude: 6.6885, longitude: -1.6244 }, fiveKmNorth], "MOTORBIKE")).toBe(
      17,
    );
  });
});

describe("Who may follow the order [AC-RT-02]", () => {
  it("its rider while carrying it, and not after", async () => {
    const riderUser = { id: rider.id, role: "RIDER" };
    const { order: otherOrder } = await createOtherOrder();

    expect(await canFollowOrder(riderUser, order.id)).toBe(true);
    expect(await canFollowOrder(riderUser, otherOrder.id)).toBe(false);

    await foodIsReady();
    await riderWasAt(AT_RESTAURANT);
    await pickUp();
    await deliver();
    expect(await canFollowOrder(riderUser, order.id)).toBe(false);
  });
});

describe("Restaurant sees the rider [AC-RORD-08]", () => {
  it("shows the rider's name, vehicle and minutes away on the board", async () => {
    const board = await as(owner).get("/api/v1/owner/orders");

    const card = board.body.data.find((item) => item.id === order.id);
    expect(card.rider).toMatchObject({
      firstName: "Kwame",
      plateNumber: "M-21-GR 1001",
      etaToRestaurantMinutes: expect.any(Number),
    });
    expect(card.rider).not.toHaveProperty("phone");
  });
});

// A second, unrelated order (placed on a Saturday noon like the first)
const createOtherOrder = async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(SATURDAY_NOON);
  const other = await createPaidOrder(2);
  vi.useRealTimers();
  return other;
};
