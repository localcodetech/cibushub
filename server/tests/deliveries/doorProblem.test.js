import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import {
  Delivery,
  Order,
  OrderStatusHistory,
  Refund,
  RiderProfile,
} from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { saveLatestLocation } from "../../src/services/rider/riderLocationStore.js";
import { sweepDoorWaits } from "../../src/services/delivery/doorProblem.service.js";
import { deliveryCodeFor } from "../../src/utils/delivery/deliveryCode.js";
import { createTestUser } from "../helpers/users.js";
import { createPaidOrder } from "../helpers/orders.js";

vi.mock("../../src/sockets/emitToUser.js", () => ({ emitToUser: vi.fn() }));
vi.mock("../../src/sockets/emitAdminAlert.js", () => ({ emitAdminAlert: vi.fn() }));
vi.mock("../../src/sockets/emitToRestaurant.js", () => ({ emitToRestaurant: vi.fn() }));
const { emitToUser } = await import("../../src/sockets/emitToUser.js");
const { emitAdminAlert } = await import("../../src/sockets/emitAdminAlert.js");
const { emitToRestaurant } = await import("../../src/sockets/emitToRestaurant.js");

const SATURDAY_NOON = new Date("2026-10-10T12:00:00Z");
// createPaidOrder: restaurant at 6.6885, -1.6244 (Adum); the customer's pin at 6.7045, -1.6155
const AT_RESTAURANT = { latitude: 6.6886, longitude: -1.6244 };
const AT_THE_DOOR = { latitude: 6.7046, longitude: -1.6155 };
const TEN_MINUTES = 10 * 60 * 1000;

let order;
let owner;
let customer;
let restaurant;
let rider;
let profile;
let admin;
let delivery;
let riderEarnings;

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
const riderPost = (action, body) =>
  as(rider).post(`/api/v1/rider/deliveries/current/${action}`, body);
const report = (problemType, note) => riderPost("problem", { problemType, note });
const callTwice = async () => {
  await riderPost("call");
  await riderPost("call");
};
const statusNow = async () => (await Order.findByPk(order.id)).status;
const deliveryNow = () => Delivery.findByPk(delivery.id);
const myDelivery = () => as(rider).get("/api/v1/rider/deliveries/current");

beforeEach(async () => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(SATURDAY_NOON);
  ({ order, owner, customer, restaurant } = await createPaidOrder());
  vi.useRealTimers();
  riderEarnings = (await Order.scope("withEarnings").findByPk(order.id)).riderEarningsPesewas;

  await as(owner).post(`/api/v1/owner/orders/${order.id}/accept`, { prepTimeMinutes: 20 });
  delivery = await Delivery.findOne({ where: { orderId: order.id } });

  rider = await createTestUser({
    role: "RIDER",
    fullName: "Efua Ansah",
    email: "efua.rider@example.com",
    phone: "+233240000402",
  });
  profile = await RiderProfile.create({
    userId: rider.id,
    vehicleType: "MOTORBIKE",
    plateNumber: "AS 1201-24",
    ghanaCardNumber: "GHA-900000402-2",
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
    reason: "Rider is at the restaurant",
  });
  await as(owner).post(`/api/v1/owner/orders/${order.id}/preparing`);
  await as(owner).post(`/api/v1/owner/orders/${order.id}/ready`);
  await riderPost("pickup");
  await riderIsAt(AT_THE_DOOR);
});

describe("Reporting a problem at the door [AC-DEL-08]", () => {
  it("customer moved: needs 2 calls and the rider at the pin, then a 10-minute wait starts", async () => {
    const tooSoon = await report("NOT_AT_ADDRESS");
    expect(tooSoon.body.error.code).toBe("CALL_THE_CUSTOMER_FIRST");

    await callTwice();
    await riderIsAt(AT_RESTAURANT);
    const tooFar = await report("NOT_AT_ADDRESS");
    expect(tooFar.status).toBe(409);
    expect(tooFar.body.error.code).toBe("NOT_AT_DROPOFF");

    await riderIsAt(AT_THE_DOOR);
    const before = Date.now();
    const response = await report("NOT_AT_ADDRESS", "Neighbour says she moved to Bantama");

    expect(response.status).toBe(200);
    const waitEndsAt = new Date(response.body.data.problem.waitEndsAt).getTime();
    expect(waitEndsAt - before).toBeGreaterThanOrEqual(TEN_MINUTES - 1000);
    expect(waitEndsAt - before).toBeLessThanOrEqual(TEN_MINUTES + 5000);
    expect(response.body.data.canReportProblem).toBe(false);
    expect(emitToUser).toHaveBeenCalledWith(
      customer.id,
      "delivery:problem",
      expect.objectContaining({ orderId: order.id, problemType: "NOT_AT_ADDRESS" }),
    );
    expect(emitAdminAlert).toHaveBeenCalledWith(
      "DELIVERY_DOOR_PROBLEM",
      expect.objectContaining({ orderId: order.id, callAttempts: 2 }),
    );
    // The customer's order page shows the wait
    const mine = await as(customer).get(`/api/v1/customer/orders/${order.id}`);
    expect(mine.body.data.doorProblem).toMatchObject({ type: "NOT_AT_ADDRESS" });

    const again = await report("UNREACHABLE");
    expect(again.body.error.code).toBe("ALREADY_REPORTED");
  });

  it("customer won't give the code: no calls needed", async () => {
    const response = await report("REFUSED_CODE", "Says the food never came");

    expect(response.status).toBe(200);
    expect((await deliveryNow()).problemType).toBe("REFUSED_CODE");
    expect((await deliveryNow()).failureReason).toBe(
      "Customer won't give the code: Says the food never came",
    );
  });

  it("if the customer turns up during the wait, the code still delivers it", async () => {
    await report("REFUSED_CODE");

    const response = await riderPost("complete", { code: deliveryCodeFor(delivery.id) });

    expect(response.status).toBe(200);
    expect(await statusNow()).toBe("DELIVERED");
    expect((await deliveryNow()).riderPayoutPesewas).toBe(riderEarnings);
  });
});

describe("The wait runs out: the food goes back [AC-DEL-08, ADR 003]", () => {
  const reportAndWaitOut = async () => {
    await report("REFUSED_CODE");
    const { waitEndsAt } = await deliveryNow();
    return sweepDoorWaits(new Date(waitEndsAt.getTime() + 1000));
  };

  it("nothing happens before the 10 minutes are up", async () => {
    await report("REFUSED_CODE");
    const { waitEndsAt } = await deliveryNow();

    const result = await sweepDoorWaits(new Date(waitEndsAt.getTime() - 60 * 1000));

    expect(result.returning).toBe(0);
    expect(await statusNow()).toBe("PICKED_UP");
  });

  it("cancels the order with no refund, and the rider takes the food back", async () => {
    const result = await reportAndWaitOut();

    expect(result.returning).toBe(1);
    expect(await statusNow()).toBe("CANCELLED");
    expect((await deliveryNow()).status).toBe("RETURNING");
    expect(await Refund.count({ where: { orderId: order.id } })).toBe(0);
    const row = await OrderStatusHistory.findOne({
      where: { orderId: order.id, toStatus: "CANCELLED" },
    });
    expect(row.actorRole).toBe("SYSTEM");
    expect(emitToUser).toHaveBeenCalledWith(
      rider.id,
      "delivery:returning",
      expect.objectContaining({ orderId: order.id }),
    );
    expect(emitToRestaurant).toHaveBeenCalledWith(
      restaurant.id,
      "order:returning",
      expect.objectContaining({ orderId: order.id }),
    );

    // The rider's screen: back to the restaurant, 1.5x shown, the customer's details gone
    const view = (await myDelivery()).body.data;
    expect(view.status).toBe("RETURNING");
    expect(view.returnPayoutPesewas).toBe(Math.round(riderEarnings * 1.5));
    expect(view.dropoff).not.toHaveProperty("phone");

    // The restaurant's board shows the food is coming back
    const board = await as(owner).get("/api/v1/owner/orders");
    expect(board.body.data.find((item) => item.id === order.id)).toMatchObject({
      isReturning: true,
      status: "CANCELLED",
    });
  });

  it("'Returned' at the restaurant frees the rider and pays 1.5x", async () => {
    await reportAndWaitOut();

    const tooFar = await riderPost("returned");
    expect(tooFar.body.error.code).toBe("RETURN_FAR_FROM_RESTAURANT");

    await riderIsAt(AT_RESTAURANT);
    const response = await riderPost("returned");

    expect(response.status).toBe(200);
    expect(response.body.data.earnedPesewas).toBe(Math.round(riderEarnings * 1.5));
    const saved = await deliveryNow();
    expect(saved).toMatchObject({ status: "FAILED", returnFlagged: false });
    expect(saved.settledAt).not.toBeNull();
    expect((await myDelivery()).body.data).toBeNull();
    expect(emitToRestaurant).toHaveBeenCalledWith(restaurant.id, "order:returned", {
      orderId: order.id,
    });

    const earnings = await as(rider).get("/api/v1/rider/earnings");
    expect(earnings.body.data.deliveries[0]).toMatchObject({
      outcome: "RETURNED",
      earningsPesewas: Math.round(riderEarnings * 1.5),
    });
  });
});

describe("An admin cancels after pickup", () => {
  it("the food still goes back to the restaurant", async () => {
    const response = await as(admin).post(`/api/v1/admin/orders/${order.id}/cancel`, {
      reason: "Customer called support to cancel after pickup",
      refund: "NONE",
    });

    expect(response.status).toBe(200);
    expect((await deliveryNow()).status).toBe("RETURNING");
    expect(emitToUser).toHaveBeenCalledWith(
      rider.id,
      "delivery:returning",
      expect.objectContaining({ orderId: order.id }),
    );
  });
});
