import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { Delivery, RiderLocation, RiderProfile } from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { createTestUser } from "../helpers/users.js";
import { createPaidOrder } from "../helpers/orders.js";

// A Friday: the test restaurant is open
const FRIDAY_NOON = new Date("2026-10-09T12:00:00Z");

let admin;
let first;
let second;

const getAs = (user, path) =>
  request(app)
    .get(path)
    .set("Cookie", `access_token=${signAccessToken(user)}`);

const orderNumbers = (response) => response.body.data.map((order) => order.orderNumber);

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(FRIDAY_NOON);
  admin = await createTestUser({
    role: "ADMIN",
    email: "admin@example.com",
    phone: "+233200000001",
  });
  first = await createPaidOrder(1);
  // The next day
  vi.setSystemTime(new Date(FRIDAY_NOON.getTime() + 24 * 60 * 60 * 1000));
  second = await createPaidOrder(2);
  await second.order.update({ status: "ACCEPTED" });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Finding orders [AC-ADM-05]", () => {
  it("lists every order, newest first, with customer and restaurant", async () => {
    const response = await getAs(admin, "/api/v1/admin/orders");

    expect(response.status).toBe(200);
    expect(orderNumbers(response)).toEqual([second.order.orderNumber, first.order.orderNumber]);
    expect(response.body.data[0].customer.phone).toBe(second.customer.phone);
    expect(response.body.data[0].restaurant.name).toBeTruthy();
    expect(response.body.meta.totalItems).toBe(2);
  });

  it("searches by order number, customer phone (any format) or restaurant name", async () => {
    const byNumber = await getAs(admin, `/api/v1/admin/orders?q=${first.order.orderNumber}`);
    // +233551234561 typed the local way
    const byPhone = await getAs(admin, "/api/v1/admin/orders?q=0551234561");
    await second.restaurant.update({ name: "Waakye Joint" });
    const byRestaurant = await getAs(admin, "/api/v1/admin/orders?q=waakye");

    expect(orderNumbers(byNumber)).toEqual([first.order.orderNumber]);
    expect(orderNumbers(byPhone)).toEqual([first.order.orderNumber]);
    expect(orderNumbers(byRestaurant)).toEqual([second.order.orderNumber]);
  });

  it("filters by status and by day (Ghana time), the end day included", async () => {
    const accepted = await getAs(admin, "/api/v1/admin/orders?status=ACCEPTED");
    const friday = await getAs(admin, "/api/v1/admin/orders?from=2026-10-09&to=2026-10-09");
    const backwards = await getAs(admin, "/api/v1/admin/orders?from=2026-10-10&to=2026-10-09");

    expect(orderNumbers(accepted)).toEqual([second.order.orderNumber]);
    expect(orderNumbers(friday)).toEqual([first.order.orderNumber]);
    expect(backwards.status).toBe(400);
  });

  it("is for admins only", async () => {
    const response = await getAs(first.customer, "/api/v1/admin/orders");

    expect(response.status).toBe(403);
  });
});

describe("One order, everything about it [AC-ADM-05]", () => {
  it("shows the timeline with who did it, payments, earnings, and the admin's options", async () => {
    const response = await getAs(admin, `/api/v1/admin/orders/${second.order.id}`);

    expect(response.status).toBe(200);
    const order = response.body.data;
    expect(order.timeline.map((entry) => entry.status)).toEqual(["PENDING_PAYMENT", "PAID"]);
    expect(order.timeline[1]).toMatchObject({ by: "SYSTEM" });
    expect(order.customer).toMatchObject({ phone: second.customer.phone });
    expect(order.payments).toEqual([]);
    expect(order).toHaveProperty("riderEarningsPesewas");
    expect(order.delivery).toBeNull();
    expect(order.adminActions).toEqual({
      canCancel: true,
      canChangeRider: false,
      canUnassignRider: false,
      canUnlockCode: false,
    });
  });

  it("shows the delivery, its rider, and the route the rider took", async () => {
    const riderUser = await createTestUser({
      role: "RIDER",
      fullName: "Yaw Mensah",
      email: "yaw@example.com",
      phone: "+233241110000",
    });
    const riderProfile = await RiderProfile.create({
      userId: riderUser.id,
      vehicleType: "MOTORBIKE",
      plateNumber: "M-21-GR 1234",
      ghanaCardNumber: "GHA-123456789-0",
      status: "APPROVED",
    });
    await Delivery.create({
      orderId: second.order.id,
      riderProfileId: riderProfile.id,
      status: "ASSIGNED",
      searchRadiusKm: 5,
      searchStartedAt: new Date(),
      assignedAt: new Date(),
    });
    for (const [latitude, minutes] of [
      [6.69, 1],
      [6.695, 2],
    ]) {
      await RiderLocation.create({
        riderProfileId: riderProfile.id,
        orderId: second.order.id,
        latitude,
        longitude: -1.62,
        recordedAt: new Date(Date.now() + minutes * 60 * 1000),
      });
    }

    const response = await getAs(admin, `/api/v1/admin/orders/${second.order.id}`);

    const order = response.body.data;
    expect(order.delivery).toMatchObject({
      status: "ASSIGNED",
      ridersAsked: 0,
      rider: { fullName: "Yaw Mensah", phone: "+233241110000", plateNumber: "M-21-GR 1234" },
    });
    expect(order.path.map((point) => point.latitude)).toEqual([6.69, 6.695]);
    expect(order.adminActions).toMatchObject({ canChangeRider: true, canUnassignRider: true });
  });

  it("answers 404 for an unknown order", async () => {
    const response = await getAs(
      admin,
      "/api/v1/admin/orders/0f1e2d3c-4b5a-4968-8776-655443322110",
    );

    expect(response.status).toBe(404);
  });
});
