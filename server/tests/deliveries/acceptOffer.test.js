import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { Delivery, DeliveryOffer, Order, RiderProfile } from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { saveLatestLocation } from "../../src/services/rider/riderLocationStore.js";
import { createTestUser } from "../helpers/users.js";
import { createPaidOrder } from "../helpers/orders.js";
import { scheduledJobs } from "../helpers/fakeJobs.js";

vi.mock("../../src/sockets/emitToUser.js", () => ({ emitToUser: vi.fn() }));
vi.mock("../../src/sockets/emitAdminAlert.js", () => ({ emitAdminAlert: vi.fn() }));

const SATURDAY_NOON = new Date("2026-10-10T12:00:00Z");
const NEAR_RESTAURANT = { latitude: 6.6975, longitude: -1.6244 };

let order;
let owner;
let delivery;
let riderCount = 0;

const onlineRider = async () => {
  riderCount += 1;
  const user = await createTestUser({
    role: "RIDER",
    email: `rider${riderCount}@example.com`,
    phone: `+23324111${String(riderCount).padStart(4, "0")}`,
  });
  const profile = await RiderProfile.create({
    userId: user.id,
    vehicleType: "MOTORBIKE",
    plateNumber: `M-21-GR ${1000 + riderCount}`,
    ghanaCardNumber: `GHA-${String(riderCount).padStart(9, "0")}-1`,
    status: "APPROVED",
    isOnline: true,
  });
  await saveLatestLocation(profile.id, NEAR_RESTAURANT, Date.now(), Date.now());
  return { user, profile };
};

// An open offer, made now (normally the assignment job makes these one at a time)
const offerTo = (profile, deliveryId = delivery.id) =>
  DeliveryOffer.create({
    deliveryId,
    riderProfileId: profile.id,
    pickupDistanceMetres: 1000,
    offeredAt: new Date(),
    expiresAt: new Date(Date.now() + 60000),
  });

const accept = (user, offer) =>
  request(app)
    .post(`/api/v1/rider/offers/${offer.id}/accept`)
    .set("Cookie", `access_token=${signAccessToken(user)}`);

const ownerTaps = (action) =>
  request(app)
    .post(`/api/v1/owner/orders/${order.id}/${action}`)
    .set("Cookie", `access_token=${signAccessToken(owner)}`)
    .send(action === "accept" ? { prepTimeMinutes: 20 } : undefined);

beforeEach(async () => {
  vi.clearAllMocks();
  riderCount = 0;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(SATURDAY_NOON);
  ({ order, owner } = await createPaidOrder());
  vi.useRealTimers();
  await ownerTaps("accept");
  delivery = await Delivery.findOne({ where: { orderId: order.id } });
});

describe("Race-safe acceptance [AC-ASSIGN-05]", () => {
  it("gives the delivery to the rider who accepts", async () => {
    const { user, profile } = await onlineRider();
    const offer = await offerTo(profile);

    const response = await accept(user, offer);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ deliveryId: delivery.id, orderId: order.id });
    const saved = await Delivery.findByPk(delivery.id);
    expect(saved).toMatchObject({ status: "ASSIGNED", riderProfileId: profile.id });
    expect((await DeliveryOffer.findByPk(offer.id)).outcome).toBe("ACCEPTED");
  });

  it("two riders accepting at the same moment: exactly one succeeds", async () => {
    const first = await onlineRider();
    const second = await onlineRider();
    const firstOffer = await offerTo(first.profile);
    const secondOffer = await offerTo(second.profile);

    // Both taps reach the server together
    const responses = await Promise.all([
      accept(first.user, firstOffer),
      accept(second.user, secondOffer),
    ]);

    const statuses = responses.map((response) => response.status).sort();
    expect(statuses).toEqual([200, 409]);
    const loser = responses.find((response) => response.status === 409);
    expect(loser.body.error).toMatchObject({
      code: "DELIVERY_TAKEN",
      message: "This delivery has already been taken",
    });
    const saved = await Delivery.findByPk(delivery.id);
    expect([first.profile.id, second.profile.id]).toContain(saved.riderProfileId);
    expect(await DeliveryOffer.count({ where: { outcome: "ACCEPTED" } })).toBe(1);
  });

  it("refuses an expired offer, and someone else's", async () => {
    const { user, profile } = await onlineRider();
    const { user: stranger } = await onlineRider();
    const offer = await offerTo(profile);

    const notMine = await accept(stranger, offer);
    await offer.update({ expiresAt: new Date(Date.now() - 1000) });
    const expired = await accept(user, offer);

    expect(notMine.status).toBe(404);
    expect(expired.status).toBe(409);
    expect(expired.body.error.code).toBe("OFFER_CLOSED");
  });
});

describe("One delivery at a time [AC-RIDER-06]", () => {
  it("refuses a second delivery while one is in hand, and closes other offers on accept", async () => {
    const { user, profile } = await onlineRider();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(SATURDAY_NOON);
    const { order: secondOrder } = await createPaidOrder(2);
    vi.useRealTimers();
    const secondDelivery = await Delivery.create({
      orderId: secondOrder.id,
      searchRadiusKm: 5,
      searchStartedAt: new Date(),
    });
    const firstOffer = await offerTo(profile);
    const secondOffer = await offerTo(profile, secondDelivery.id);

    await accept(user, firstOffer);
    const again = await accept(user, secondOffer);

    // Accepting the first closed the second, and its delivery looks for someone else
    expect((await DeliveryOffer.findByPk(secondOffer.id)).outcome).toBe("SUPERSEDED");
    expect(scheduledJobs).toContainEqual({ name: "offerDelivery", deliveryId: secondDelivery.id });
    expect(again.status).toBe(409);
    expect(["RIDER_BUSY", "OFFER_CLOSED"]).toContain(again.body.error.code);
  });
});

describe("Rider assigned = food ready AND rider accepted (ADR 003)", () => {
  it("rider first: the order waits, then becomes RIDER_ASSIGNED when the food is ready", async () => {
    const { user, profile } = await onlineRider();
    await accept(user, await offerTo(profile));

    expect((await Order.findByPk(order.id)).status).toBe("ACCEPTED");

    await ownerTaps("preparing");
    const ready = await ownerTaps("ready");

    expect(ready.status).toBe(200);
    expect((await Order.findByPk(order.id)).status).toBe("RIDER_ASSIGNED");
  });

  it("food first: the order becomes RIDER_ASSIGNED the moment a rider accepts", async () => {
    await ownerTaps("preparing");
    await ownerTaps("ready");
    expect((await Order.findByPk(order.id)).status).toBe("READY_FOR_PICKUP");
    const { user, profile } = await onlineRider();

    await accept(user, await offerTo(profile));

    expect((await Order.findByPk(order.id)).status).toBe("RIDER_ASSIGNED");
  });

  it("food ready with no rider yet: the order stays READY_FOR_PICKUP", async () => {
    await ownerTaps("preparing");
    await ownerTaps("ready");

    expect((await Order.findByPk(order.id)).status).toBe("READY_FOR_PICKUP");
  });
});
