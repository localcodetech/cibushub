import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { AuditLog } from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { createTestUser } from "../helpers/users.js";
import { addRequiredDocuments, createOwner, createTestRestaurant } from "../helpers/restaurants.js";

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

describe("Audit log for restaurant reviews [AC-ADM-07]", () => {
  it("records who approved, the status change and the IP", async () => {
    const restaurant = await createTestRestaurant(owner);
    await addRequiredDocuments(restaurant);

    await postAs(admin, reviewUrl(restaurant, "approve"));

    const rows = await AuditLog.findAll();
    expect(rows).toHaveLength(1);
    expect(rows[0].actorId).toBe(admin.id);
    expect(rows[0].action).toBe("RESTAURANT_APPROVED");
    expect(rows[0].targetType).toBe("restaurant");
    expect(rows[0].targetId).toBe(restaurant.id);
    expect(rows[0].before).toEqual({ status: "PENDING_APPROVAL" });
    expect(rows[0].after).toEqual({ status: "APPROVED" });
    expect(rows[0].ipAddress).toBeTruthy();
  });

  it("records the reason for a rejection", async () => {
    const restaurant = await createTestRestaurant(owner);

    await postAs(admin, reviewUrl(restaurant, "reject"), { reason: "Blurry FDA certificate" });

    const row = await AuditLog.findOne();
    expect(row.action).toBe("RESTAURANT_REJECTED");
    expect(row.reason).toBe("Blurry FDA certificate");
  });

  it("records the reason for a suspension", async () => {
    const restaurant = await createTestRestaurant(owner, { status: "APPROVED" });

    await postAs(admin, reviewUrl(restaurant, "suspend"), {
      reason: "Repeated food safety complaints",
    });

    const row = await AuditLog.findOne();
    expect(row.action).toBe("RESTAURANT_SUSPENDED");
    expect(row.before).toEqual({ status: "APPROVED" });
    expect(row.reason).toBe("Repeated food safety complaints");
  });

  it("writes nothing when the action is refused", async () => {
    const restaurant = await createTestRestaurant(owner, { status: "REJECTED" });

    await postAs(admin, reviewUrl(restaurant, "approve"));

    expect(await AuditLog.count()).toBe(0);
  });

  it("can never be edited or deleted", async () => {
    const restaurant = await createTestRestaurant(owner);
    await addRequiredDocuments(restaurant);
    await postAs(admin, reviewUrl(restaurant, "approve"));
    const row = await AuditLog.findOne();

    await expect(row.update({ reason: "changed" })).rejects.toThrow("append-only");
    await expect(row.destroy()).rejects.toThrow("append-only");
    await expect(AuditLog.destroy({ where: {} })).rejects.toThrow("append-only");
    expect(await AuditLog.count()).toBe(1);
  });
});
