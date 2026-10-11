import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { Delivery, Order, RiderProfile } from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { periodRange } from "../../src/services/rider/riderEarnings.service.js";
import { createTestUser } from "../helpers/users.js";
import { createPaidOrder } from "../helpers/orders.js";

const SATURDAY_NOON = new Date("2026-10-10T12:00:00Z");

let rider;
let profile;
let otherProfile;
let earningsEach;

const newRider = async (number) => {
  const user = await createTestUser({
    role: "RIDER",
    email: `rider${number}@example.com`,
    phone: `+23324111000${number}`,
  });
  const riderProfile = await RiderProfile.create({
    userId: user.id,
    vehicleType: "MOTORBIKE",
    plateNumber: `M-21-GR 100${number}`,
    ghanaCardNumber: `GHA-00000000${number}-1`,
    status: "APPROVED",
  });
  return { user, riderProfile };
};

// One order of its own for each delivery (an order has one delivery)
let orderNumber = 0;
const delivered = async (riderProfileId, deliveredAt, status = "DELIVERED") => {
  orderNumber += 1;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(SATURDAY_NOON);
  const { order } = await createPaidOrder(orderNumber);
  vi.useRealTimers();
  return Delivery.create({
    orderId: order.id,
    riderProfileId,
    status,
    searchRadiusKm: 5,
    searchStartedAt: deliveredAt,
    pickedUpAt: deliveredAt,
    deliveredAt: status === "DELIVERED" ? deliveredAt : null,
    failedAt: status === "FAILED" ? deliveredAt : null,
  });
};

const myEarnings = (query) =>
  request(app)
    .get("/api/v1/rider/earnings")
    .query({ date: "2026-10-10", ...query })
    .set("Cookie", `access_token=${signAccessToken(rider)}`);

beforeEach(async () => {
  orderNumber = 0;
  ({ user: rider, riderProfile: profile } = await newRider(1));
  ({ riderProfile: otherProfile } = await newRider(2));

  await delivered(profile.id, new Date("2026-10-10T12:30:00Z")); // today
  await delivered(profile.id, new Date("2026-10-06T09:00:00Z")); // this week (Tuesday)
  await delivered(profile.id, new Date("2026-10-01T18:00:00Z")); // this month, last week
  await delivered(profile.id, new Date("2026-09-30T18:00:00Z")); // last month
  await delivered(profile.id, new Date("2026-10-10T11:00:00Z"), "FAILED"); // earns nothing
  await delivered(otherProfile.id, new Date("2026-10-10T13:00:00Z")); // someone else's

  const anyOrder = await Order.scope("withEarnings").findOne();
  earningsEach = anyOrder.riderEarningsPesewas;
});

describe("Rider earnings [AC-RIDER-07]", () => {
  it("counts only my delivered orders, per day, week (from Monday) and month", async () => {
    const day = await myEarnings({ period: "day" });
    const week = await myEarnings({ period: "week" });
    const month = await myEarnings({ period: "month" });

    expect(day.status).toBe(200);
    expect(day.body.data.summary).toMatchObject({
      period: "day",
      deliveryCount: 1,
      earningsPesewas: earningsEach,
    });
    expect(week.body.data.summary.deliveryCount).toBe(2);
    expect(week.body.data.summary.from).toBe("2026-10-05T00:00:00.000Z");
    expect(month.body.data.summary).toMatchObject({
      deliveryCount: 3,
      earningsPesewas: 3 * earningsEach,
    });
  });

  it("lists completed deliveries newest first, paged, without the customer's details", async () => {
    const response = await myEarnings({ period: "month", pageSize: 2 });

    expect(response.body.meta).toMatchObject({ page: 1, pageSize: 2, totalItems: 3 });
    // The totals cover every page
    expect(response.body.data.summary.deliveryCount).toBe(3);
    const [newest, next] = response.body.data.deliveries;
    expect(newest.deliveredAt).toBe("2026-10-10T12:30:00.000Z");
    expect(next.deliveredAt).toBe("2026-10-06T09:00:00.000Z");
    expect(Object.keys(newest).sort()).toEqual(
      [
        "deliveredAt",
        "deliveryId",
        "distanceMetres",
        "dropoffArea",
        "earningsPesewas",
        "orderNumber",
        "pickedUpAt",
        "restaurantArea",
        "restaurantName",
      ].sort(),
    );
  });

  it("looks back at another day, and refuses an unknown period or a future day", async () => {
    const lastMonth = await myEarnings({ period: "day", date: "2026-09-30" });
    expect(lastMonth.body.data.summary.deliveryCount).toBe(1);

    const bad = await myEarnings({ period: "year" });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe("VALIDATION_ERROR");

    // Tomorrow hasn't happened yet
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const future = await myEarnings({ period: "day", date: tomorrow });
    expect(future.status).toBe(400);
    expect(future.body.error.details[0].message).toBe("Choose today or an earlier day");
  });

  it("works out the week across a month's end", () => {
    // Thursday 1 October 2026 is in the week of Monday 28 September
    const { from, to } = periodRange("week", "2026-10-01");
    expect(from.toISOString()).toBe("2026-09-28T00:00:00.000Z");
    expect(to.toISOString()).toBe("2026-10-05T00:00:00.000Z");
  });
});
