import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { User } from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { createTestUser } from "../helpers/users.js";
import { createOwner, createTestRestaurant } from "../helpers/restaurants.js";
import { sentSms } from "../helpers/fakeSms.js";
import { sentEmails } from "../helpers/fakeEmail.js";

let admin;
let owner;

beforeEach(async () => {
  admin = await createTestUser({
    role: "ADMIN",
    email: "admin@example.com",
    phone: "+233201112222",
  });
  owner = await createOwner();
});

const postAs = (user, path, body = {}) => {
  return request(app)
    .post(path)
    .set("Cookie", `access_token=${signAccessToken(user)}`)
    .send(body);
};

const reviewUrl = (restaurant, action) => `/api/v1/admin/restaurants/${restaurant.id}/${action}`;

describe("POST /api/v1/admin/restaurants/:restaurantId/approve", () => {
  it("approves a pending restaurant and texts and emails the owner [AC-REST-02, AC-NOTIF-01]", async () => {
    const restaurant = await createTestRestaurant(owner);

    const response = await postAs(admin, reviewUrl(restaurant, "approve"));

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("APPROVED");
    expect(response.body.data.approvedAt).not.toBeNull();
    expect(sentSms.at(-1).phone).toBe(owner.phone);
    expect(sentSms.at(-1).message).toContain("approved");
    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0]).toMatchObject({ to: owner.email });
    expect(sentEmails[0].subject).toContain("approved");
  });

  it("activates the owner's account on their first approval [AC-AUTH-05]", async () => {
    const restaurant = await createTestRestaurant(owner);

    await postAs(admin, reviewUrl(restaurant, "approve"));

    const ownerAfter = await User.findByPk(owner.id);
    expect(ownerAfter.status).toBe("ACTIVE");
  });

  it("reinstates a suspended restaurant", async () => {
    const restaurant = await createTestRestaurant(owner, { status: "SUSPENDED" });

    const response = await postAs(admin, reviewUrl(restaurant, "approve"));

    expect(response.body.data.status).toBe("APPROVED");
  });

  it("refuses to approve a rejected restaurant [AC-REST-03]", async () => {
    const restaurant = await createTestRestaurant(owner, {
      status: "REJECTED",
      rejectionReason: "Blurry FDA certificate",
    });

    const response = await postAs(admin, reviewUrl(restaurant, "approve"));

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("INVALID_STATUS_TRANSITION");
  });

  it("returns 404 for a restaurant that does not exist", async () => {
    const response = await postAs(admin, "/api/v1/admin/restaurants/not-a-real-id/approve");

    expect(response.status).toBe(404);
  });
});

describe("POST /api/v1/admin/restaurants/:restaurantId/reject", () => {
  it("rejects with a reason, saves it and texts and emails the owner [AC-REST-02, AC-NOTIF-01]", async () => {
    const restaurant = await createTestRestaurant(owner);

    const response = await postAs(admin, reviewUrl(restaurant, "reject"), {
      reason: "The FDA certificate photo is blurry",
    });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("REJECTED");
    expect(response.body.data.rejectionReason).toBe("The FDA certificate photo is blurry");
    expect(sentSms.at(-1).message).toContain("The FDA certificate photo is blurry");
    expect(sentEmails.at(-1).text).toContain("The FDA certificate photo is blurry");
  });

  it("requires a reason [AC-REST-02]", async () => {
    const restaurant = await createTestRestaurant(owner);

    const noReason = await postAs(admin, reviewUrl(restaurant, "reject"));
    const shortReason = await postAs(admin, reviewUrl(restaurant, "reject"), { reason: "bad" });

    expect(noReason.status).toBe(400);
    expect(shortReason.status).toBe(400);
  });

  it("keeps the owner's account waiting for approval", async () => {
    const restaurant = await createTestRestaurant(owner);

    await postAs(admin, reviewUrl(restaurant, "reject"), {
      reason: "Missing business registration",
    });

    const ownerAfter = await User.findByPk(owner.id);
    expect(ownerAfter.status).toBe("PENDING_APPROVAL");
  });
});

describe("POST /api/v1/admin/restaurants/:restaurantId/suspend", () => {
  it("suspends an approved restaurant but leaves the owner active [AC-ADM-03]", async () => {
    await owner.update({ status: "ACTIVE" });
    const restaurant = await createTestRestaurant(owner, { status: "APPROVED" });

    const response = await postAs(admin, reviewUrl(restaurant, "suspend"), {
      reason: "Several food safety complaints",
    });

    const ownerAfter = await User.findByPk(owner.id);
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("SUSPENDED");
    expect(ownerAfter.status).toBe("ACTIVE");
  });

  it("refuses to suspend a restaurant that was never approved", async () => {
    const restaurant = await createTestRestaurant(owner);

    const response = await postAs(admin, reviewUrl(restaurant, "suspend"), {
      reason: "Several food safety complaints",
    });

    expect(response.status).toBe(409);
  });
});

describe("Who can review restaurants [AC-RBAC-02]", () => {
  it("lets super admins approve", async () => {
    const superAdmin = await createTestUser({
      role: "SUPER_ADMIN",
      email: "super@example.com",
      phone: "+233209998888",
    });
    const restaurant = await createTestRestaurant(owner);

    const response = await postAs(superAdmin, reviewUrl(restaurant, "approve"));

    expect(response.status).toBe(200);
  });

  it("blocks owners from approving their own restaurant", async () => {
    const restaurant = await createTestRestaurant(owner);

    const response = await postAs(owner, reviewUrl(restaurant, "approve"));

    expect(response.status).toBe(403);
  });

  it("blocks customers", async () => {
    const customer = await createTestUser({
      email: "customer@example.com",
      phone: "+233245556666",
    });
    const restaurant = await createTestRestaurant(owner);

    const response = await postAs(customer, reviewUrl(restaurant, "approve"));

    expect(response.status).toBe(403);
  });
});
