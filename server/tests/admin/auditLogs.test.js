import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { AuditLog } from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { createTestUser } from "../helpers/users.js";

let admin;
let otherAdmin;
let ama;

const getAs = (user, path) =>
  request(app)
    .get(path)
    .set("Cookie", `access_token=${signAccessToken(user)}`);

const actions = (response) => response.body.data.map((log) => log.action);

const write = (fields) =>
  AuditLog.create({
    actorId: admin.id,
    targetType: "user",
    targetId: ama.id,
    before: { status: "ACTIVE" },
    after: { status: "SUSPENDED" },
    reason: "A reason",
    ipAddress: "10.0.0.1",
    ...fields,
  });

beforeEach(async () => {
  admin = await createTestUser({
    role: "ADMIN",
    fullName: "Ada Admin",
    email: "admin@example.com",
    phone: "+233200000001",
  });
  otherAdmin = await createTestUser({
    role: "SUPER_ADMIN",
    fullName: "Sam Super",
    email: "super@example.com",
    phone: "+233200000002",
  });
  ama = await createTestUser({ email: "ama@example.com", phone: "+233241234567" });

  await write({ action: "USER_SUSPENDED", createdAt: new Date("2026-10-09T10:00:00Z") });
  await write({
    action: "USER_REACTIVATED",
    actorId: otherAdmin.id,
    before: { status: "SUSPENDED" },
    after: { status: "ACTIVE" },
    createdAt: new Date("2026-10-10T10:00:00Z"),
  });
  await write({
    action: "REVIEW_HIDDEN",
    targetType: "review",
    createdAt: new Date("2026-10-11T10:00:00Z"),
  });
});

describe("Audit log viewer [AC-ADM-07]", () => {
  it("lists every action newest first: who, what, on what, before, after, why, from where", async () => {
    const response = await getAs(admin, "/api/v1/admin/audit-logs");

    expect(response.status).toBe(200);
    expect(actions(response)).toEqual(["REVIEW_HIDDEN", "USER_REACTIVATED", "USER_SUSPENDED"]);
    expect(response.body.data[1]).toMatchObject({
      action: "USER_REACTIVATED",
      targetType: "user",
      targetId: ama.id,
      before: { status: "SUSPENDED" },
      after: { status: "ACTIVE" },
      reason: "A reason",
      ipAddress: "10.0.0.1",
      actor: { id: otherAdmin.id, fullName: "Sam Super", role: "SUPER_ADMIN" },
    });
  });

  it("filters by action, target, admin and days (Ghana time, end day included)", async () => {
    const byAction = await getAs(admin, "/api/v1/admin/audit-logs?action=USER_SUSPENDED");
    const byTarget = await getAs(
      admin,
      `/api/v1/admin/audit-logs?targetType=user&targetId=${ama.id}`,
    );
    const byAdmin = await getAs(admin, `/api/v1/admin/audit-logs?actorId=${otherAdmin.id}`);
    const byDays = await getAs(admin, "/api/v1/admin/audit-logs?from=2026-10-09&to=2026-10-10");

    expect(actions(byAction)).toEqual(["USER_SUSPENDED"]);
    expect(actions(byTarget)).toEqual(["USER_REACTIVATED", "USER_SUSPENDED"]);
    expect(actions(byAdmin)).toEqual(["USER_REACTIVATED"]);
    expect(actions(byDays)).toEqual(["USER_REACTIVATED", "USER_SUSPENDED"]);
  });

  it("lists the action names in use, for the filter", async () => {
    const response = await getAs(admin, "/api/v1/admin/audit-logs/actions");

    expect(response.body.data).toEqual(["REVIEW_HIDDEN", "USER_REACTIVATED", "USER_SUSPENDED"]);
  });

  it("refuses bad filters, and is for admins only", async () => {
    const badAction = await getAs(admin, "/api/v1/admin/audit-logs?action=drop table");
    const customer = await getAs(ama, "/api/v1/admin/audit-logs");

    expect(badAction.status).toBe(400);
    expect(customer.status).toBe(403);
  });
});
