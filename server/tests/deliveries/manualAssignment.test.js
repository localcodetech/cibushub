import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import {
  AuditLog,
  Delivery,
  DeliveryOffer,
  Order,
  OrderStatusHistory,
  RiderProfile,
} from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { saveLatestLocation } from "../../src/services/rider/riderLocationStore.js";
import { offerNextRider } from "../../src/services/delivery/assignment.service.js";
import { createTestUser } from "../helpers/users.js";
import { createPaidOrder } from "../helpers/orders.js";
import { scheduledJobs } from "../helpers/fakeJobs.js";

vi.mock("../../src/sockets/emitToUser.js", () => ({ emitToUser: vi.fn() }));
vi.mock("../../src/sockets/emitAdminAlert.js", () => ({ emitAdminAlert: vi.fn() }));
const { emitToUser } = await import("../../src/sockets/emitToUser.js");

const SATURDAY_NOON = new Date("2026-10-10T12:00:00Z");
const NEAR_RESTAURANT = { latitude: 6.6975, longitude: -1.6244 };

let order;
let owner;
let admin;
let delivery;
let riderCount = 0;

const onlineRider = async ({ isOnline = true } = {}) => {
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
    isOnline,
  });
  await saveLatestLocation(profile.id, NEAR_RESTAURANT, Date.now(), Date.now());
  return { user, profile };
};

const as = (user) => ({
  post: (path, body) =>
    request(app)
      .post(path)
      .set("Cookie", `access_token=${signAccessToken(user)}`)
      .send(body),
});
const assign = (profile, reason = "Rider is waiting at the restaurant") =>
  as(admin).post(`/api/v1/admin/orders/${order.id}/rider`, { riderProfileId: profile.id, reason });
const ownerTaps = (action) => as(owner).post(`/api/v1/owner/orders/${order.id}/${action}`);
const statusNow = async () => (await Order.findByPk(order.id)).status;
// History rows written in the same second can't be told apart by time, so find them by content
const historyRow = (toStatus, actorRole) =>
  OrderStatusHistory.findOne({ where: { orderId: order.id, toStatus, actorRole } });

beforeEach(async () => {
  vi.clearAllMocks();
  riderCount = 0;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(SATURDAY_NOON);
  ({ order, owner } = await createPaidOrder());
  vi.useRealTimers();
  admin = await createTestUser({
    role: "ADMIN",
    email: "admin@example.com",
    phone: "+233200000001",
  });
  await as(owner).post(`/api/v1/owner/orders/${order.id}/accept`, { prepTimeMinutes: 20 });
  delivery = await Delivery.findOne({ where: { orderId: order.id } });
});

describe("Manual assignment [AC-ASSIGN-07]", () => {
  it("gives the order to the chosen rider while it cooks, and logs who did it", async () => {
    const { user, profile } = await onlineRider();

    const response = await assign(profile);

    expect(response.status).toBe(200);
    expect(await Delivery.findByPk(delivery.id)).toMatchObject({
      status: "ASSIGNED",
      riderProfileId: profile.id,
    });
    // Not ready yet, so the order itself waits (ADR 003)
    expect(await statusNow()).toBe("ACCEPTED");
    expect(emitToUser).toHaveBeenCalledWith(user.id, "delivery:assigned", {
      orderId: order.id,
      deliveryId: delivery.id,
    });
    // On record as the rider's accepted offer
    const offer = await DeliveryOffer.findOne({ where: { riderProfileId: profile.id } });
    expect(offer.outcome).toBe("ACCEPTED");
    const audit = await AuditLog.findOne({ where: { targetId: order.id } });
    expect(audit).toMatchObject({ action: "DELIVERY_RIDER_ASSIGNED", actorId: admin.id });
  });

  it("food ready: the order becomes RIDER_ASSIGNED, recorded in the status history", async () => {
    await ownerTaps("preparing");
    await ownerTaps("ready");
    const { profile } = await onlineRider();

    await assign(profile);

    expect(await statusNow()).toBe("RIDER_ASSIGNED");
    const row = await historyRow("RIDER_ASSIGNED", "ADMIN");
    expect(row.actorUserId).toBe(admin.id);
    expect(row.reason).toContain("Rider is waiting at the restaurant");
  });

  it("replaces a rider: both moves are in the history and the old rider is told", async () => {
    await ownerTaps("preparing");
    await ownerTaps("ready");
    const first = await onlineRider();
    const second = await onlineRider();
    await assign(first.profile);

    const response = await assign(second.profile, "First rider's bike broke down");

    expect(response.status).toBe(200);
    expect(await statusNow()).toBe("RIDER_ASSIGNED");
    expect((await Delivery.findByPk(delivery.id)).riderProfileId).toBe(second.profile.id);
    // Back to Ready (rider replaced), then Rider assigned again, both by the admin
    const back = await historyRow("READY_FOR_PICKUP", "ADMIN");
    expect(back.reason).toContain("Rider replaced by an admin: First rider's bike broke down");
    expect(
      await OrderStatusHistory.count({
        where: { orderId: order.id, toStatus: "RIDER_ASSIGNED", actorRole: "ADMIN" },
      }),
    ).toBe(2);
    expect(emitToUser).toHaveBeenCalledWith(first.user.id, "delivery:unassigned", {
      orderId: order.id,
      reason: "First rider's bike broke down",
    });
  });

  it("refuses riders who are offline or busy, and non-admins", async () => {
    const { profile: offline } = await onlineRider({ isOnline: false });
    const { user: rider, profile: busy } = await onlineRider();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(SATURDAY_NOON);
    const { order: other } = await createPaidOrder(2);
    vi.useRealTimers();
    await Delivery.create({
      orderId: other.id,
      riderProfileId: busy.id,
      status: "ASSIGNED",
      searchRadiusKm: 5,
      searchStartedAt: new Date(),
    });

    const notOnline = await assign(offline);
    const carrying = await assign(busy);
    const byRider = await as(rider).post(`/api/v1/admin/orders/${order.id}/rider`, {
      riderProfileId: busy.id,
      reason: "I want this one",
    });

    expect(notOnline.body.error.code).toBe("RIDER_NOT_AVAILABLE");
    expect(carrying.body.error.code).toBe("RIDER_BUSY");
    expect(byRider.status).toBe(403);
  });

  it("can't change the rider once the food is picked up", async () => {
    const { profile } = await onlineRider();
    const { profile: other } = await onlineRider();
    await assign(profile);
    await Delivery.update({ status: "PICKED_UP" }, { where: { id: delivery.id } });

    const response = await assign(other);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("DELIVERY_ALREADY_PICKED_UP");
  });
});

describe("Unassignment [AC-ASSIGN-08]", () => {
  it("admin takes the rider off: back to Ready, back to the search, never asked again", async () => {
    await ownerTaps("preparing");
    await ownerTaps("ready");
    const { user, profile } = await onlineRider();
    await assign(profile);
    scheduledJobs.length = 0;

    const response = await as(admin).post(`/api/v1/admin/orders/${order.id}/rider/unassign`, {
      reason: "Rider not answering calls",
    });

    expect(response.status).toBe(200);
    expect(await statusNow()).toBe("READY_FOR_PICKUP");
    expect(await Delivery.findByPk(delivery.id)).toMatchObject({
      status: "SEARCHING",
      riderProfileId: null,
      searchRadiusKm: 5,
    });
    expect(scheduledJobs).toContainEqual({ name: "offerDelivery", deliveryId: delivery.id });
    expect(emitToUser).toHaveBeenCalledWith(user.id, "delivery:unassigned", {
      orderId: order.id,
      reason: "Rider not answering calls",
    });
    // The same rider, still online and nearby, is not offered it again
    expect(await offerNextRider(delivery.id)).toEqual({ result: "NO_RIDER" });
  });

  it("the rider gives it back before pickup (breakdown), recorded as the rider", async () => {
    await ownerTaps("preparing");
    await ownerTaps("ready");
    const { user, profile } = await onlineRider();
    await assign(profile);

    const response = await as(user).post("/api/v1/rider/deliveries/current/unassign", {
      reason: "My motorbike broke down",
    });

    expect(response.status).toBe(200);
    expect(await statusNow()).toBe("READY_FOR_PICKUP");
    const row = await historyRow("READY_FOR_PICKUP", "RIDER");
    expect(row.reason).toBe("My motorbike broke down");
  });

  it("not after pickup, and not without a delivery in hand", async () => {
    const { user, profile } = await onlineRider();
    const { user: idle } = await onlineRider();
    await assign(profile);
    await Delivery.update({ status: "PICKED_UP" }, { where: { id: delivery.id } });
    const giveUp = (who) =>
      as(who).post("/api/v1/rider/deliveries/current/unassign", { reason: "Changed my mind" });

    const afterPickup = await giveUp(user);
    const nothingInHand = await giveUp(idle);

    expect(afterPickup.status).toBe(409);
    expect(afterPickup.body.error.code).toBe("DELIVERY_ALREADY_PICKED_UP");
    expect(nothingInHand.status).toBe(404);
  });
});

describe("Admin cancels an order with a rider", () => {
  it("ends the delivery, so the rider is free for new offers", async () => {
    const { user, profile } = await onlineRider();
    await assign(profile);

    const response = await as(admin).post(`/api/v1/admin/orders/${order.id}/cancel`, {
      reason: "Customer called to cancel",
      refund: "NONE",
    });

    expect(response.status).toBe(200);
    expect((await Delivery.findByPk(delivery.id)).status).toBe("CANCELLED");
    expect(emitToUser).toHaveBeenCalledWith(user.id, "delivery:unassigned", {
      orderId: order.id,
      reason: "Customer called to cancel",
    });
  });
});
