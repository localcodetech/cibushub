import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { createOwner, createTestRestaurant, fullWeek } from "../helpers/restaurants.js";

let owner;
let otherOwner;

beforeEach(async () => {
  owner = await createOwner({ status: "ACTIVE" });
  otherOwner = await createOwner({ email: "other@example.com", phone: "+233551112222" });
});

const sendAs = (user, method, path, body = {}) => {
  return request(app)
    [method](path)
    .set("Cookie", `access_token=${signAccessToken(user)}`)
    .send(body);
};

const restaurantUrl = (restaurant, ending = "") =>
  `/api/v1/owner/restaurants/${restaurant.id}${ending}`;

describe("PATCH /api/v1/owner/restaurants/:restaurantId", () => {
  it("saves profile and delivery changes immediately [AC-REST-04, AC-REST-07]", async () => {
    const restaurant = await createTestRestaurant(owner, { status: "APPROVED" });

    const response = await sendAs(owner, "patch", restaurantUrl(restaurant), {
      name: "Esi's Chop Bar",
      prepTimeMinutes: 35,
      minOrderPesewas: 2000,
    });

    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe("Esi's Chop Bar");
    expect(response.body.data.prepTimeMinutes).toBe(35);
    expect(response.body.data.minOrderPesewas).toBe(2000);
    expect(response.body.data.status).toBe("APPROVED");
    expect(response.body.data.area).toBe("Adum");
  });

  it("sends an approved restaurant back for review when the legal name changes [AC-REST-04]", async () => {
    const restaurant = await createTestRestaurant(owner, { status: "APPROVED" });

    const response = await sendAs(owner, "patch", restaurantUrl(restaurant), {
      legalName: "Esi Foods and Catering Ltd",
    });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("PENDING_APPROVAL");
  });

  it("rejects decimal pesewas and an empty body", async () => {
    const restaurant = await createTestRestaurant(owner, { status: "APPROVED" });

    const decimal = await sendAs(owner, "patch", restaurantUrl(restaurant), {
      minOrderPesewas: 15.5,
    });
    const empty = await sendAs(owner, "patch", restaurantUrl(restaurant), {});

    expect(decimal.status).toBe(400);
    expect(empty.status).toBe(400);
  });

  it("refuses to edit a suspended restaurant", async () => {
    const restaurant = await createTestRestaurant(owner, { status: "SUSPENDED" });

    const response = await sendAs(owner, "patch", restaurantUrl(restaurant), { name: "New Name" });

    expect(response.status).toBe(403);
  });

  it("returns 404 when editing another owner's restaurant [AC-RBAC-04]", async () => {
    const restaurantOfOther = await createTestRestaurant(otherOwner);

    const response = await sendAs(owner, "patch", restaurantUrl(restaurantOfOther), {
      name: "Stolen Kitchen",
    });

    expect(response.status).toBe(404);
  });
});

describe("PUT /api/v1/owner/restaurants/:restaurantId/opening-hours", () => {
  it("replaces the whole week [AC-REST-05]", async () => {
    const restaurant = await createTestRestaurant(owner, { status: "APPROVED" });
    const lateNights = fullWeek.map((day) =>
      day.isClosed ? day : { ...day, opensAt: "18:00", closesAt: "02:00" },
    );

    const response = await sendAs(owner, "put", restaurantUrl(restaurant, "/opening-hours"), {
      openingHours: lateNights,
    });

    expect(response.status).toBe(200);
    expect(response.body.data.openingHours).toHaveLength(7);
    expect(response.body.data.openingHours[1].opensAt).toBe("18:00:00");
    expect(response.body.data.openingHours[1].closesAt).toBe("02:00:00");
  });

  it("keeps the old hours when the new week is invalid", async () => {
    const restaurant = await createTestRestaurant(owner, { status: "APPROVED" });

    const response = await sendAs(owner, "put", restaurantUrl(restaurant, "/opening-hours"), {
      openingHours: fullWeek.slice(0, 3),
    });
    const after = await sendAs(owner, "get", restaurantUrl(restaurant));

    expect(response.status).toBe(400);
    expect(after.body.data.openingHours[1].opensAt).toBe("08:00:00");
  });

  it("returns 404 for another owner's restaurant [AC-RBAC-04]", async () => {
    const restaurantOfOther = await createTestRestaurant(otherOwner);

    const response = await sendAs(
      owner,
      "put",
      restaurantUrl(restaurantOfOther, "/opening-hours"),
      {
        openingHours: fullWeek,
      },
    );

    expect(response.status).toBe(404);
  });
});

describe("PATCH /api/v1/owner/restaurants/:restaurantId/accepting-orders", () => {
  it("lets an approved restaurant close and reopen for orders [AC-REST-06]", async () => {
    const restaurant = await createTestRestaurant(owner, { status: "APPROVED" });
    const switchUrl = restaurantUrl(restaurant, "/accepting-orders");

    const closed = await sendAs(owner, "patch", switchUrl, { isAcceptingOrders: false });
    const reopened = await sendAs(owner, "patch", switchUrl, { isAcceptingOrders: true });

    expect(closed.body.data.isAcceptingOrders).toBe(false);
    expect(reopened.body.data.isAcceptingOrders).toBe(true);
  });

  it("refuses a restaurant that is not approved yet", async () => {
    const restaurant = await createTestRestaurant(owner);

    const response = await sendAs(owner, "patch", restaurantUrl(restaurant, "/accepting-orders"), {
      isAcceptingOrders: false,
    });

    expect(response.status).toBe(409);
  });

  it("blocks owners whose account is still waiting for approval [AC-AUTH-05]", async () => {
    const restaurant = await createTestRestaurant(otherOwner);

    const response = await sendAs(
      otherOwner,
      "patch",
      restaurantUrl(restaurant, "/accepting-orders"),
      { isAcceptingOrders: false },
    );

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("ACCOUNT_PENDING_APPROVAL");
  });
});

describe("POST /api/v1/owner/restaurants/:restaurantId/resubmit", () => {
  it("sends a rejected restaurant back for approval and clears the reason [AC-REST-03]", async () => {
    const restaurant = await createTestRestaurant(owner, {
      status: "REJECTED",
      rejectionReason: "The FDA certificate is blurry",
    });

    const response = await sendAs(owner, "post", restaurantUrl(restaurant, "/resubmit"));

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("PENDING_APPROVAL");
    expect(response.body.data.rejectionReason).toBeNull();
  });

  it("refuses to resubmit a restaurant that was not rejected", async () => {
    const restaurant = await createTestRestaurant(owner, { status: "APPROVED" });

    const response = await sendAs(owner, "post", restaurantUrl(restaurant, "/resubmit"));

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("INVALID_STATUS_TRANSITION");
  });
});
