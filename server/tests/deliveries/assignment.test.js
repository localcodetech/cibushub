import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { Delivery, DeliveryOffer, Order, RiderProfile } from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { saveLatestLocation } from "../../src/services/rider/riderLocationStore.js";
import {
  offerNextRider,
  sweepSearchingDeliveries,
} from "../../src/services/delivery/assignment.service.js";
import { createTestUser } from "../helpers/users.js";
import { createPaidOrder } from "../helpers/orders.js";
import { scheduledJobs } from "../helpers/fakeJobs.js";

vi.mock("../../src/sockets/emitToUser.js", () => ({ emitToUser: vi.fn() }));
vi.mock("../../src/sockets/emitAdminAlert.js", () => ({ emitAdminAlert: vi.fn() }));
const { emitToUser } = await import("../../src/sockets/emitToUser.js");
const { emitAdminAlert } = await import("../../src/sockets/emitAdminAlert.js");

// The test restaurant is in Adum. 0.009° of latitude is about 1 km.
const RESTAURANT = { latitude: 6.6885, longitude: -1.6244 };
const kmNorth = (km) => ({ latitude: RESTAURANT.latitude + km * 0.009, longitude: -1.6244 });

const T0 = new Date("2026-10-10T12:00:00Z");
const after = (seconds) => new Date(T0.getTime() + seconds * 1000);

let order;
let owner;
let customer;
let riderCount = 0;

// An approved rider, online, last seen at `seenAt` at the given point
const onlineRider = async (point, { seenAt = T0, status = "APPROVED" } = {}) => {
  riderCount += 1;
  const user = await createTestUser({
    role: "RIDER",
    fullName: `Rider ${riderCount}`,
    email: `rider${riderCount}@example.com`,
    phone: `+23324111${String(riderCount).padStart(4, "0")}`,
  });
  const profile = await RiderProfile.create({
    userId: user.id,
    vehicleType: "MOTORBIKE",
    plateNumber: `M-21-GR ${1000 + riderCount}`,
    ghanaCardNumber: `GHA-${String(riderCount).padStart(9, "0")}-1`,
    status,
    isOnline: true,
    wentOnlineAt: T0,
  });
  await saveLatestLocation(profile.id, point, seenAt.getTime(), seenAt.getTime());
  return { user, profile };
};

const acceptAsOwner = () =>
  request(app)
    .post(`/api/v1/owner/orders/${order.id}/accept`)
    .set("Cookie", `access_token=${signAccessToken(owner)}`)
    .send({ prepTimeMinutes: 20 });

const deliveryOf = () => Delivery.findOne({ where: { orderId: order.id } });

beforeEach(async () => {
  vi.clearAllMocks();
  riderCount = 0;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(T0);
  ({ order, owner, customer } = await createPaidOrder());
  await acceptAsOwner();
  vi.useRealTimers();
});

describe("Assignment trigger [AC-ASSIGN-01]", () => {
  it("opens a delivery when the restaurant accepts, and starts the search", async () => {
    const delivery = await deliveryOf();

    expect(delivery).toMatchObject({ status: "SEARCHING", searchRadiusKm: 5 });
    expect(scheduledJobs).toContainEqual({ name: "offerDelivery", deliveryId: delivery.id });
  });
});

describe("Sequential offers [AC-ASSIGN-02, AC-ASSIGN-03]", () => {
  it("offers the nearest rider first, with what they need to decide", async () => {
    await onlineRider(kmNorth(3));
    const { user: nearest, profile } = await onlineRider(kmNorth(1));
    const delivery = await deliveryOf();

    const outcome = await offerNextRider(delivery.id, after(5));

    expect(outcome).toMatchObject({ result: "OFFERED", riderProfileId: profile.id });
    expect(emitToUser).toHaveBeenCalledWith(
      nearest.id,
      "delivery:offer",
      expect.objectContaining({
        restaurantName: "Auntie Esi's Kitchen",
        earningsPesewas: expect.any(Number),
        expiresAt: after(65),
      }),
    );
    const [offerView] = emitToUser.mock.calls[0].slice(2);
    expect(offerView.pickupDistanceMetres).toBeGreaterThan(900);
    expect(offerView.pickupDistanceMetres).toBeLessThan(1100);
    // No customer name or phone in an offer
    expect(JSON.stringify(offerView)).not.toContain("Ama");
    expect(scheduledJobs).toContainEqual(
      expect.objectContaining({ name: "offerDelivery", delayMs: 60500 }),
    );
  });

  it("waits while the rider still has time to answer", async () => {
    await onlineRider(kmNorth(1));
    const delivery = await deliveryOf();
    await offerNextRider(delivery.id, after(5));

    expect(await offerNextRider(delivery.id, after(30))).toEqual({ result: "WAITING" });
  });
});

describe("Decline or timeout [AC-ASSIGN-04]", () => {
  it("moves to the next rider after 60 seconds, and never asks the first again", async () => {
    const { profile: first } = await onlineRider(kmNorth(1));
    const { profile: second } = await onlineRider(kmNorth(2));
    const delivery = await deliveryOf();

    await offerNextRider(delivery.id, after(5));
    const next = await offerNextRider(delivery.id, after(66));
    const afterBoth = await offerNextRider(delivery.id, after(127));

    expect(next).toMatchObject({ result: "OFFERED", riderProfileId: second.id });
    expect(afterBoth).toEqual({ result: "NO_RIDER" });
    const firstOffer = await DeliveryOffer.findOne({ where: { riderProfileId: first.id } });
    expect(firstOffer.outcome).toBe("EXPIRED");
  });

  it("asks the next rider straight away when one declines", async () => {
    // The API checks offers against the real clock, so this one happens now
    const now = new Date();
    const { user: first } = await onlineRider(kmNorth(1), { seenAt: now });
    const { profile: second } = await onlineRider(kmNorth(2), { seenAt: now });
    const delivery = await deliveryOf();
    const { offerId } = await offerNextRider(delivery.id, now);

    const declined = await request(app)
      .post(`/api/v1/rider/offers/${offerId}/decline`)
      .set("Cookie", `access_token=${signAccessToken(first)}`);
    const next = await offerNextRider(delivery.id, new Date());

    expect(declined.status).toBe(200);
    expect((await DeliveryOffer.findByPk(offerId)).outcome).toBe("DECLINED");
    expect(scheduledJobs).toContainEqual({ name: "offerDelivery", deliveryId: delivery.id });
    expect(next).toMatchObject({ result: "OFFERED", riderProfileId: second.id });
  });

  it("refuses to decline someone else's offer, or one that has closed", async () => {
    const now = new Date();
    const { user: rider } = await onlineRider(kmNorth(1), { seenAt: now });
    const { user: stranger } = await onlineRider(kmNorth(4), { seenAt: now });
    const delivery = await deliveryOf();
    const { offerId } = await offerNextRider(delivery.id, now);
    const decline = (user) =>
      request(app)
        .post(`/api/v1/rider/offers/${offerId}/decline`)
        .set("Cookie", `access_token=${signAccessToken(user)}`);

    const notMine = await decline(stranger);
    await DeliveryOffer.update({ outcome: "EXPIRED" }, { where: { id: offerId } });
    const closed = await decline(rider);

    expect(notMine.status).toBe(404);
    expect(closed.status).toBe(409);
    expect(closed.body.error.code).toBe("OFFER_CLOSED");
  });
});

describe("Who may be asked [AC-ASSIGN-02, AC-RIDER-06]", () => {
  it("skips riders with an old location, a delivery in hand, another offer, or no approval", async () => {
    await onlineRider(kmNorth(0.5), { seenAt: after(-180) }); // last seen 3 minutes ago
    await onlineRider(kmNorth(0.6), { status: "SUSPENDED" });
    const { profile: busy } = await onlineRider(kmNorth(0.7));
    const { profile: thinking } = await onlineRider(kmNorth(0.8));
    const { profile: free } = await onlineRider(kmNorth(4));

    // "busy" carries another order; "thinking" is looking at another offer
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(T0);
    // A second, independent order that "busy" is carrying
    const { order: other } = await createPaidOrder(2);
    vi.useRealTimers();
    const otherDelivery = await Delivery.create({
      orderId: other.id,
      riderProfileId: busy.id,
      status: "ASSIGNED",
      searchRadiusKm: 5,
      searchStartedAt: T0,
    });
    await DeliveryOffer.create({
      deliveryId: otherDelivery.id,
      riderProfileId: thinking.id,
      pickupDistanceMetres: 500,
      offeredAt: T0,
      expiresAt: after(60),
    });
    const delivery = await deliveryOf();

    const outcome = await offerNextRider(delivery.id, after(5));

    expect(outcome).toMatchObject({ result: "OFFERED", riderProfileId: free.id });
  });
});

describe("No rider available [AC-ASSIGN-06]", () => {
  it("widens the search once when nobody is within 5 km", async () => {
    const { profile: far } = await onlineRider(kmNorth(7));
    const delivery = await deliveryOf();

    const outcome = await offerNextRider(delivery.id, after(5));

    expect(outcome).toMatchObject({ result: "OFFERED", riderProfileId: far.id });
    const widened = await deliveryOf();
    expect(widened.searchRadiusKm).toBe(10);
    expect(widened.radiusWidenedAt).toEqual(after(5));
  });

  it("after 10 minutes, alerts admins and tells the customer, once", async () => {
    const delivery = await deliveryOf();

    const early = await offerNextRider(delivery.id, after(5 * 60));
    await offerNextRider(delivery.id, after(10 * 60));
    await offerNextRider(delivery.id, after(11 * 60));

    expect(early).toEqual({ result: "NO_RIDER" });
    expect(emitAdminAlert).toHaveBeenCalledTimes(1);
    expect(emitAdminAlert).toHaveBeenCalledWith(
      "NO_RIDER_FOUND",
      expect.objectContaining({ orderId: order.id }),
    );
    expect(emitToUser).toHaveBeenCalledWith(
      customer.id,
      "order:delay",
      expect.objectContaining({ orderId: order.id }),
    );
  });

  it("asks a rider who comes online later, through the every-minute sweep", async () => {
    await sweepSearchingDeliveries(after(60));
    const { profile: late } = await onlineRider(kmNorth(2), { seenAt: after(100) });

    const swept = await sweepSearchingDeliveries(after(120));

    expect(swept).toEqual({ checked: 1, OFFERED: 1 });
    expect(await DeliveryOffer.count({ where: { riderProfileId: late.id } })).toBe(1);
  });
});

describe("Order cancelled while searching", () => {
  it("stops the search and closes waiting offers", async () => {
    await onlineRider(kmNorth(1));
    const delivery = await deliveryOf();
    const { offerId } = await offerNextRider(delivery.id, after(5));
    await Order.update({ status: "CANCELLED" }, { where: { id: order.id } });

    const outcome = await offerNextRider(delivery.id, after(10));

    expect(outcome).toEqual({ result: "CLOSED" });
    expect((await deliveryOf()).status).toBe("CANCELLED");
    expect((await DeliveryOffer.findByPk(offerId)).outcome).toBe("SUPERSEDED");
  });
});

describe("The offer after reconnecting", () => {
  it("gives the rider the offer still waiting for them", async () => {
    // A real-time offer, so it is still open when the app asks
    const now = new Date();
    const { user } = await onlineRider(kmNorth(1), { seenAt: now });
    const delivery = await deliveryOf();
    const { offerId } = await offerNextRider(delivery.id, now);

    const response = await request(app)
      .get("/api/v1/rider/offers/current")
      .set("Cookie", `access_token=${signAccessToken(user)}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ offerId, restaurantName: "Auntie Esi's Kitchen" });
  });
});
