import { createServer } from "node:http";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { io as connectClient } from "socket.io-client";
import app from "../../src/app.js";
import redis from "../../src/config/redis.js";
import { Delivery, RiderLocation, RiderProfile } from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { createSocketServer } from "../../src/sockets/socketServer.js";
import {
  recordRiderLocation,
  sweepStaleRiders,
} from "../../src/services/rider/riderPresence.service.js";
import { createTestUser } from "../helpers/users.js";
import { createPaidOrder } from "../helpers/orders.js";

vi.mock("../../src/sockets/emitToUser.js", () => ({ emitToUser: vi.fn() }));
vi.mock("../../src/sockets/emitAdminAlert.js", () => ({ emitAdminAlert: vi.fn() }));
const { emitToUser } = await import("../../src/sockets/emitToUser.js");
const { emitAdminAlert } = await import("../../src/sockets/emitAdminAlert.js");

// Adum, Kumasi, and a point about 100 m away
const ADUM = { latitude: 6.6885, longitude: -1.6244 };
const NEARBY = { latitude: 6.6894, longitude: -1.6244 };
// Accra: about 200 km away
const ACCRA = { latitude: 5.6037, longitude: -0.187 };

const T0 = new Date("2026-10-10T12:00:00Z");
const after = (seconds) => new Date(T0.getTime() + seconds * 1000);

let rider;
let profile;

// An approved rider with an active account
const createApprovedRider = async (overrides = {}) => {
  const user = await createTestUser({
    role: "RIDER",
    status: "ACTIVE",
    email: overrides.email || "yaw.rider@example.com",
    phone: overrides.phone || "+233241110000",
    phoneVerifiedAt: new Date(),
  });
  const application = await RiderProfile.create({
    userId: user.id,
    vehicleType: "MOTORBIKE",
    plateNumber: "M-21-GR 1234",
    ghanaCardNumber: overrides.ghanaCardNumber || "GHA-123456789-0",
    status: overrides.status || "APPROVED",
  });
  return { user, application };
};

const statusUrl = "/api/v1/rider/status";
const post = (user, path, body) =>
  request(app)
    .post(statusUrl + path)
    .set("Cookie", `access_token=${signAccessToken(user)}`)
    .send(body);

// The throttle uses real time; tests that move the clock forward clear it in between
const clearThrottle = () => redis.del(`rider:location-wait:${profile.id}`);
const sendAt = async (point, seconds) => {
  await clearThrottle();
  return recordRiderLocation(rider.id, point, after(seconds));
};

beforeEach(async () => {
  vi.clearAllMocks();
  ({ user: rider, application: profile } = await createApprovedRider());
});

describe("Online and offline [AC-RIDER-03, AC-RIDER-04]", () => {
  it("goes online with a location: on the map of available riders", async () => {
    const response = await post(rider, "/online", { ...ADUM, accuracyMetres: 12 });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ applicationStatus: "APPROVED", isOnline: true });
    expect(response.body.data.lastLocationAt).toBeTruthy();
    const [position] = await redis.geopos("riders:online", profile.id);
    expect(Number(position[1])).toBeCloseTo(ADUM.latitude, 4);
    expect(await RiderLocation.count({ where: { riderProfileId: profile.id } })).toBe(1);
  });

  it("refuses to go online without a location", async () => {
    const response = await post(rider, "/online", {});

    expect(response.status).toBe(400);
    expect((await RiderProfile.findByPk(profile.id)).isOnline).toBe(false);
  });

  it("only lets approved riders go online", async () => {
    const { user: suspended } = await createApprovedRider({
      email: "kojo.rider@example.com",
      phone: "+233241110001",
      ghanaCardNumber: "GHA-111111111-1",
      status: "SUSPENDED",
    });

    const response = await post(suspended, "/online", ADUM);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("RIDER_NOT_APPROVED");
  });

  it("goes offline: off the map, no more location kept", async () => {
    await post(rider, "/online", ADUM);

    const response = await post(rider, "/offline");

    expect(response.body.data.isOnline).toBe(false);
    expect(await redis.geopos("riders:online", profile.id)).toEqual([null]);
    expect(await redis.exists(`rider:location:${profile.id}`)).toBe(0);
  });

  it("takes a suspended rider offline at once", async () => {
    const admin = await createTestUser({
      role: "ADMIN",
      email: "admin@example.com",
      phone: "+233200000001",
    });
    await post(rider, "/online", ADUM);

    await request(app)
      .post(`/api/v1/admin/riders/${profile.id}/suspend`)
      .set("Cookie", `access_token=${signAccessToken(admin)}`)
      .send({ reason: "Several customers reported rude behaviour" });

    expect((await RiderProfile.findByPk(profile.id)).isOnline).toBe(false);
    expect(await redis.geopos("riders:online", profile.id)).toEqual([null]);
  });
});

describe("Live location rules [AC-RT-05, AC-RT-06]", () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(T0);
    await post(rider, "/online", ADUM);
    vi.useRealTimers();
  });

  it("keeps a normal point as the rider's latest position", async () => {
    const answer = await sendAt(NEARBY, 5);

    expect(answer).toEqual({ ok: true });
    const latest = await redis.hgetall(`rider:location:${profile.id}`);
    expect(Number(latest.latitude)).toBeCloseTo(NEARBY.latitude, 4);
  });

  it("ignores points less than 3 seconds apart", async () => {
    await clearThrottle();
    const first = await recordRiderLocation(rider.id, NEARBY, after(5));
    const second = await recordRiderLocation(rider.id, ADUM, after(6));

    expect(first).toEqual({ ok: true });
    expect(second).toEqual({ ok: false, reason: "TOO_FREQUENT" });
  });

  it("refuses impossible coordinates", async () => {
    expect(await sendAt({ latitude: 95, longitude: 0 }, 5)).toEqual({
      ok: false,
      reason: "INVALID",
    });
    expect(await sendAt({ latitude: "6.6", longitude: "-1.6" }, 10)).toEqual({
      ok: false,
      reason: "INVALID",
    });
  });

  it("refuses a jump no rider could make, but trusts a point after a long silence", async () => {
    const jump = await sendAt(ACCRA, 5);
    const afterSilence = await sendAt(ACCRA, 3 * 60);

    expect(jump).toEqual({ ok: false, reason: "IMPLAUSIBLE" });
    expect(afterSilence).toEqual({ ok: true });
  });

  it("writes history to MySQL at most every 30 seconds", async () => {
    await sendAt(NEARBY, 10);
    await sendAt(ADUM, 20);
    await sendAt(NEARBY, 31);

    // The point when going online (t=0) and the one at t=31
    expect(await RiderLocation.count({ where: { riderProfileId: profile.id } })).toBe(2);
  });

  it("ignores locations from a rider who is offline", async () => {
    await post(rider, "/offline");

    expect(await sendAt(NEARBY, 5)).toEqual({ ok: false, reason: "OFFLINE" });
  });
});

describe("Stale riders [AC-RIDER-05]", () => {
  it("takes a rider silent for 5 minutes offline, and tells their app", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(T0);
    await post(rider, "/online", ADUM);
    vi.useRealTimers();

    const stillFresh = await sweepStaleRiders(after(4 * 60));
    const stale = await sweepStaleRiders(after(5 * 60 + 1));

    expect(stillFresh).toEqual({ checked: 1, wentOffline: 0, flagged: 0 });
    expect(stale).toEqual({ checked: 1, wentOffline: 1, flagged: 0 });
    expect((await RiderProfile.findByPk(profile.id)).isOnline).toBe(false);
    expect(emitToUser).toHaveBeenCalledWith(rider.id, "rider:status", {
      isOnline: false,
      reason: "NO_LOCATION",
    });
  });
});

describe("Silent rider on a delivery (plan-review C10)", () => {
  it("is kept online and flagged to admins instead", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(T0);
    await post(rider, "/online", ADUM);
    const { order } = await createPaidOrder();
    vi.useRealTimers();
    await Delivery.create({
      orderId: order.id,
      riderProfileId: profile.id,
      status: "PICKED_UP",
      searchRadiusKm: 5,
      searchStartedAt: T0,
    });

    const result = await sweepStaleRiders(after(10 * 60));

    expect(result).toEqual({ checked: 1, wentOffline: 0, flagged: 1 });
    expect((await RiderProfile.findByPk(profile.id)).isOnline).toBe(true);
    expect(emitAdminAlert).toHaveBeenCalledWith(
      "RIDER_SILENT_ON_DELIVERY",
      expect.objectContaining({ riderProfileId: profile.id, orderId: order.id }),
    );
  });
});

describe("Location over the socket [AC-RT-04]", () => {
  let httpServer;
  let sockets;
  let url;

  beforeAll(async () => {
    httpServer = createServer(app);
    sockets = createSocketServer(httpServer);
    await new Promise((resolve) => httpServer.listen(0, resolve));
    url = `http://localhost:${httpServer.address().port}`;
  });

  afterAll(async () => {
    await sockets.close();
  });

  it("answers the rider's phone: kept, or why not", async () => {
    await post(rider, "/online", ADUM);
    await clearThrottle();
    const client = connectClient(url, {
      transports: ["websocket"],
      extraHeaders: { cookie: `access_token=${signAccessToken(rider)}` },
      reconnection: false,
    });
    await new Promise((resolve) => client.on("connect", resolve));

    const send = (point) => new Promise((resolve) => client.emit("rider:location", point, resolve));
    const kept = await send(NEARBY);
    const tooSoon = await send(ADUM);
    client.disconnect();

    expect(kept).toEqual({ ok: true });
    expect(tooSoon).toEqual({ ok: false, reason: "TOO_FREQUENT" });
  });
});
