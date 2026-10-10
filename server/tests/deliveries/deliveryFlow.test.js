import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import {
  Delivery,
  Order,
  OrderStatusHistory,
  RiderLocation,
  RiderProfile,
} from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { saveLatestLocation } from "../../src/services/rider/riderLocationStore.js";
import { goOnline } from "../../src/services/rider/riderPresence.service.js";
import { deliveryCodeFor } from "../../src/utils/delivery/deliveryCode.js";
import { createTestUser } from "../helpers/users.js";
import { createPaidOrder } from "../helpers/orders.js";

vi.mock("../../src/sockets/emitToUser.js", () => ({ emitToUser: vi.fn() }));
vi.mock("../../src/sockets/emitAdminAlert.js", () => ({ emitAdminAlert: vi.fn() }));
const { emitAdminAlert } = await import("../../src/sockets/emitAdminAlert.js");
const { emitToUser } = await import("../../src/sockets/emitToUser.js");

const SATURDAY_NOON = new Date("2026-10-10T12:00:00Z");
// The restaurant in createPaidOrder is at 6.6885, -1.6244 (Adum)
const AT_RESTAURANT = { latitude: 6.6886, longitude: -1.6244 };
const ONE_KM_AWAY = { latitude: 6.6975, longitude: -1.6244 };

let order;
let owner;
let customer;
let rider;
let profile;
let delivery;
let admin;

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
const riderIsAt = (point) => saveLatestLocation(profile.id, point, Date.now(), Date.now());
const myDelivery = () => as(rider).get("/api/v1/rider/deliveries/current");
const pickUp = (body) => as(rider).post("/api/v1/rider/deliveries/current/pickup", body);
const deliverWith = (code) => as(rider).post("/api/v1/rider/deliveries/current/complete", { code });
const foodIsReady = async () => {
  await as(owner).post(`/api/v1/owner/orders/${order.id}/preparing`);
  await as(owner).post(`/api/v1/owner/orders/${order.id}/ready`);
};
const statusNow = async () => (await Order.findByPk(order.id)).status;
const wrongCode = () => (deliveryCodeFor(delivery.id) === "0000" ? "1111" : "0000");

beforeEach(async () => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(SATURDAY_NOON);
  ({ order, owner, customer } = await createPaidOrder());
  vi.useRealTimers();

  await as(owner).post(`/api/v1/owner/orders/${order.id}/accept`, { prepTimeMinutes: 20 });
  delivery = await Delivery.findOne({ where: { orderId: order.id } });

  rider = await createTestUser({
    role: "RIDER",
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
  await riderIsAt(AT_RESTAURANT);

  admin = await createTestUser({
    role: "ADMIN",
    email: "admin@example.com",
    phone: "+233200000001",
  });
  await as(admin).post(`/api/v1/admin/orders/${order.id}/rider`, {
    riderProfileId: profile.id,
    reason: "Rider is waiting at the restaurant",
  });
});

describe("Pickup [AC-DEL-01, AC-DEL-02]", () => {
  it("shows where to collect and only the drop-off area, and waits for the kitchen", async () => {
    const before = await myDelivery();

    expect(before.status).toBe(200);
    expect(before.body.data.foodReady).toBe(false);
    expect(before.body.data.pickup.restaurantName).toBe("Auntie Esi's Kitchen");
    expect(before.body.data.items).toEqual([{ name: "Waakye", quantity: 2 }]);
    // No name, pin or phone before pickup [AC-DEL-05]
    expect(Object.keys(before.body.data.dropoff)).toEqual(["area"]);

    const tooEarly = await pickUp();
    expect(tooEarly.status).toBe(409);
    expect(tooEarly.body.error.code).toBe("FOOD_NOT_READY");
  });

  it("at the restaurant: the order is PICKED_UP by the rider and drop-off details appear [AC-DEL-04]", async () => {
    await foodIsReady();

    const response = await pickUp();

    expect(response.status).toBe(200);
    expect(await statusNow()).toBe("PICKED_UP");
    const saved = await Delivery.findByPk(delivery.id);
    expect(saved.status).toBe("PICKED_UP");
    expect(saved.pickupFlagged).toBe(false);
    expect(saved.pickupDistanceMetres).toBeLessThan(200);

    const row = await OrderStatusHistory.findOne({
      where: { orderId: order.id, toStatus: "PICKED_UP" },
    });
    expect(row.actorRole).toBe("RIDER");
    expect(row.actorUserId).toBe(rider.id);

    expect(response.body.data.dropoff).toMatchObject({
      customerFirstName: "Ama",
      landmark: "Blue gate opposite the pharmacy",
      phone: customer.phone,
    });
    expect(emitAdminAlert).not.toHaveBeenCalled();
  });

  it("can't be picked up twice", async () => {
    await foodIsReady();
    await pickUp();

    const again = await pickUp();

    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("DELIVERY_ALREADY_PICKED_UP");
  });
});

describe("Pickup geofence [AC-DEL-03]", () => {
  it("1 km away: warned first, then allowed on confirm and flagged for admins", async () => {
    await foodIsReady();
    await riderIsAt(ONE_KM_AWAY);

    const warned = await pickUp({});
    expect(warned.status).toBe(409);
    expect(warned.body.error.code).toBe("PICKUP_FAR_FROM_RESTAURANT");
    expect(warned.body.error.details[0].distanceMetres).toBeGreaterThan(900);
    expect(await statusNow()).toBe("RIDER_ASSIGNED");

    const confirmed = await pickUp({ confirmFarAway: true });

    expect(confirmed.status).toBe(200);
    expect(await statusNow()).toBe("PICKED_UP");
    const saved = await Delivery.findByPk(delivery.id);
    expect(saved.pickupFlagged).toBe(true);
    expect(saved.pickupDistanceMetres).toBeGreaterThan(900);
    expect(emitAdminAlert).toHaveBeenCalledWith(
      "PICKUP_FLAGGED",
      expect.objectContaining({ orderId: order.id, riderProfileId: profile.id }),
    );
  });
});

describe("Delivery code [AC-DEL-06]", () => {
  it("is shown to the customer only once the food is on its way", async () => {
    await foodIsReady();
    const before = await as(customer).get(`/api/v1/customer/orders/${order.id}`);
    expect(before.body.data.deliveryCode).toBeNull();

    await pickUp();
    const after = await as(customer).get(`/api/v1/customer/orders/${order.id}`);

    expect(after.body.data.deliveryCode).toMatch(/^\d{4}$/);
    expect(after.body.data.deliveryCode).toBe(deliveryCodeFor(delivery.id));
  });

  it("a wrong code is refused and counted; after 5 the code locks and admins are told", async () => {
    await foodIsReady();
    await pickUp();

    const first = await deliverWith(wrongCode());
    expect(first.status).toBe(400);
    expect(first.body.error.code).toBe("WRONG_DELIVERY_CODE");
    expect(first.body.error.message).toContain("4 attempt(s) left");
    expect(await statusNow()).toBe("PICKED_UP");

    for (let attempt = 2; attempt <= 5; attempt += 1) {
      await deliverWith(wrongCode());
    }
    expect((await Delivery.findByPk(delivery.id)).codeAttempts).toBe(5);
    expect(emitAdminAlert).toHaveBeenCalledWith(
      "DELIVERY_CODE_LOCKED",
      expect.objectContaining({ orderId: order.id }),
    );

    // Even the right code is refused now
    const locked = await deliverWith(deliveryCodeFor(delivery.id));
    expect(locked.status).toBe(429);
    expect(locked.body.error.code).toBe("DELIVERY_CODE_LOCKED");
    expect(await statusNow()).toBe("PICKED_UP");
  });

  it("can't be entered before pickup", async () => {
    await foodIsReady();

    const response = await deliverWith(deliveryCodeFor(delivery.id));

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("NOT_PICKED_UP");
  });
});

describe("Complete delivery [AC-DEL-05, AC-DEL-07]", () => {
  it("the right code delivers the order, frees the rider and hides the customer's phone", async () => {
    await foodIsReady();
    await pickUp();

    const response = await deliverWith(deliveryCodeFor(delivery.id));

    expect(response.status).toBe(200);
    expect(await statusNow()).toBe("DELIVERED");
    const saved = await Delivery.findByPk(delivery.id);
    expect(saved.status).toBe("DELIVERED");
    expect(saved.deliveredAt).not.toBeNull();

    // No current delivery: no phone number, and free for the next offer
    const after = await myDelivery();
    expect(after.body.data).toBeNull();
  });

  it("location history is tied to the order only while the delivery is going on [AC-RT-06]", async () => {
    await foodIsReady();
    await pickUp();

    await goOnline(rider.id, ONE_KM_AWAY, new Date(Date.now() + 31 * 1000));
    await deliverWith(deliveryCodeFor(delivery.id));
    await goOnline(rider.id, ONE_KM_AWAY, new Date(Date.now() + 62 * 1000));

    const points = await RiderLocation.findAll({
      where: { riderProfileId: profile.id },
      order: [["recordedAt", "ASC"]],
    });
    expect(points.map((point) => point.orderId)).toEqual([order.id, null]);
  });
});

describe("Failed delivery [AC-DEL-08]", () => {
  const callCustomer = () => as(rider).post("/api/v1/rider/deliveries/current/call");
  const reportUnreachable = (body) =>
    as(rider).post("/api/v1/rider/deliveries/current/unreachable", body);
  const pickedUpAtTheDoor = async () => {
    await foodIsReady();
    await pickUp();
    await riderIsAt({ latitude: 6.7045, longitude: -1.6155 });
  };

  it("needs 2 calls first; then admins get the rider's location and call count", async () => {
    await pickedUpAtTheDoor();

    const tooSoon = await reportUnreachable({});
    expect(tooSoon.status).toBe(409);
    expect(tooSoon.body.error.code).toBe("CALL_THE_CUSTOMER_FIRST");

    const firstCall = await callCustomer();
    expect(firstCall.body.data).toEqual({ phone: customer.phone, callAttempts: 1 });
    await callCustomer();

    const reported = await reportUnreachable({ note: "Blue gate locked, nobody answers" });

    expect(reported.status).toBe(200);
    expect(reported.body.data.unreachableReportedAt).not.toBeNull();
    expect(reported.body.data.canReportUnreachable).toBe(false);
    const saved = await Delivery.findByPk(delivery.id);
    expect(saved.callAttempts).toBe(2);
    expect(Number(saved.reportedLatitude)).toBeCloseTo(6.7045, 4);
    expect(saved.failureReason).toBe("Customer unreachable: Blue gate locked, nobody answers");
    expect(emitAdminAlert).toHaveBeenCalledWith(
      "CUSTOMER_UNREACHABLE",
      expect.objectContaining({
        orderId: order.id,
        callAttempts: 2,
        location: { latitude: 6.7045, longitude: -1.6155 },
      }),
    );
    expect(emitToUser).toHaveBeenCalledWith(customer.id, "delivery:unreachable", {
      orderId: order.id,
    });
    // The rider keeps the food and waits for the admin's decision
    expect(await statusNow()).toBe("PICKED_UP");

    const again = await reportUnreachable({});
    expect(again.body.error.code).toBe("ALREADY_REPORTED");
  });

  it("if the customer turns up after the report, the code still completes it", async () => {
    await pickedUpAtTheDoor();
    await callCustomer();
    await callCustomer();
    await reportUnreachable({});

    const response = await deliverWith(deliveryCodeFor(delivery.id));

    expect(response.status).toBe(200);
    expect(await statusNow()).toBe("DELIVERED");
  });

  it("the admin cancels with a refund choice: the delivery is FAILED and the rider is free", async () => {
    await pickedUpAtTheDoor();
    await callCustomer();
    await callCustomer();
    await reportUnreachable({});

    const cancelled = await as(admin).post(`/api/v1/admin/orders/${order.id}/cancel`, {
      reason: "Customer unreachable for 15 minutes at the drop-off",
      refund: "NONE",
    });

    expect(cancelled.status).toBe(200);
    expect(await statusNow()).toBe("CANCELLED");
    const saved = await Delivery.findByPk(delivery.id);
    expect(saved.status).toBe("FAILED");
    expect(saved.failedAt).not.toBeNull();
    expect((await myDelivery()).body.data).toBeNull();
  });
});

describe("Unlocking the delivery code [AC-DEL-06]", () => {
  it("an admin unlocks it after 5 wrong codes, and the rider can finish", async () => {
    await foodIsReady();
    await pickUp();
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await deliverWith(wrongCode());
    }
    const unlock = (user) =>
      as(user).post(`/api/v1/admin/orders/${order.id}/delivery/unlock-code`, {
        reason: "Customer confirmed by phone",
      });

    expect((await unlock(rider)).status).toBe(403);
    const unlocked = await unlock(admin);

    expect(unlocked.status).toBe(200);
    expect(unlocked.body.data.codeAttemptsLeft).toBe(5);
    expect(emitToUser).toHaveBeenCalledWith(rider.id, "delivery:code-unlocked", {
      orderId: order.id,
    });
    const delivered = await deliverWith(deliveryCodeFor(delivery.id));
    expect(delivered.status).toBe(200);
  });
});
