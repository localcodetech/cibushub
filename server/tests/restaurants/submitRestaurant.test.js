import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { OpeningHours, Restaurant } from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { createTestUser } from "../helpers/users.js";
import { createOwner, fullWeek, validRestaurant } from "../helpers/restaurants.js";

const submit = (user, body) => {
  return request(app)
    .post("/api/v1/owner/restaurants")
    .set("Cookie", `access_token=${signAccessToken(user)}`)
    .send(body);
};

describe("POST /api/v1/owner/restaurants", () => {
  it("lets a verified owner waiting for approval submit a restaurant [AC-REST-01]", async () => {
    const owner = await createOwner();

    const response = await submit(owner, validRestaurant);

    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe("PENDING_APPROVAL");
    expect(response.body.data.ownerId).toBe(owner.id);
    expect(response.body.data.phone).toBe("+233241234567");
    expect(response.body.data.city).toBe("Kumasi");
    expect(response.body.data.cuisineTags).toEqual(["ghanaian", "rice"]);
    expect(response.body.data.latitude).toBe(6.6885);
  });

  it("saves all 7 days of opening hours in order [AC-REST-05]", async () => {
    const owner = await createOwner();

    const response = await submit(owner, validRestaurant);

    const days = response.body.data.openingHours.map((day) => day.dayOfWeek);
    expect(days).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(await OpeningHours.count()).toBe(7);
  });

  it("never lets an owner approve their own restaurant [AC-REST-01]", async () => {
    const owner = await createOwner();

    const response = await submit(owner, { ...validRestaurant, status: "APPROVED" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(await Restaurant.count()).toBe(0);
  });

  it("refuses an owner whose phone is not verified [AC-AUTH-05]", async () => {
    const owner = await createOwner({ phoneVerifiedAt: null });

    const response = await submit(owner, validRestaurant);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("ACCOUNT_NOT_VERIFIED");
  });

  it("refuses customers [AC-RBAC-02]", async () => {
    const customer = await createTestUser({ role: "CUSTOMER" });

    const response = await submit(customer, validRestaurant);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("refuses visitors who are not logged in [AC-RBAC-01]", async () => {
    const response = await request(app).post("/api/v1/owner/restaurants").send(validRestaurant);

    expect(response.status).toBe(401);
  });

  it("rejects missing days and hours that open and close at the same time [AC-REST-05]", async () => {
    const owner = await createOwner();
    const sixDays = fullWeek.slice(1);
    const sameTimes = fullWeek.map((day) =>
      day.isClosed ? day : { ...day, opensAt: "09:00", closesAt: "09:00" },
    );

    const missingDay = await submit(owner, { ...validRestaurant, openingHours: sixDays });
    const sameTime = await submit(owner, { ...validRestaurant, openingHours: sameTimes });

    expect(missingDay.status).toBe(400);
    expect(sameTime.status).toBe(400);
  });

  it("accepts hours that cross midnight [AC-REST-05]", async () => {
    const owner = await createOwner();
    const lateNight = fullWeek.map((day) =>
      day.isClosed ? day : { ...day, opensAt: "18:00", closesAt: "02:00" },
    );

    const response = await submit(owner, { ...validRestaurant, openingHours: lateNight });

    expect(response.status).toBe(201);
  });

  it("rejects a map pin outside Ghana", async () => {
    const owner = await createOwner();

    const response = await submit(owner, { ...validRestaurant, latitude: 51.5, longitude: -0.12 });

    expect(response.status).toBe(400);
    expect(response.body.error.details.map((detail) => detail.field)).toContain("latitude");
  });
});
