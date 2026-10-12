import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { closeQueues } from "../../src/jobs/queues.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { createTestUser } from "../helpers/users.js";

const url = "/api/v1/super-admin/queues";

const as = (user, path = url) =>
  request(app)
    .get(path)
    .set("Cookie", `access_token=${signAccessToken(user)}`);

// The dashboard opened real queue connections: close them so the test run can end
afterAll(async () => {
  await closeQueues();
});

describe("Queue dashboard [AC-JOB-05]", () => {
  it("opens for super admins", async () => {
    const boss = await createTestUser({
      role: "SUPER_ADMIN",
      email: "boss@example.com",
      phone: "+233200000004",
    });

    const response = await as(boss);

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.text).toContain("CibusHub queues");

    // Its own script files load from behind the same login (no inline code, so the
    // security headers don't block them)
    const script = response.text.match(/src="(static\/js\/main\.[^"]+\.js)"/)[1];
    const file = await as(boss, url + "/" + script);
    expect(file.status).toBe(200);
    expect(file.headers["content-type"]).toContain("javascript");
  });

  it("lists the queues read-only", async () => {
    const boss = await createTestUser({
      role: "SUPER_ADMIN",
      email: "boss@example.com",
      phone: "+233200000004",
    });

    // The data the dashboard page reads
    const response = await as(boss, url + "/api/queues");

    expect(response.status).toBe(200);
    const queues = response.body.queues;
    expect(queues.map((queue) => queue.name).sort()).toEqual([
      "assignment",
      "maintenance",
      "notifications",
      "payments",
    ]);
    expect(queues.every((queue) => queue.readOnlyMode === true)).toBe(true);
  });

  it("is closed to everyone else", async () => {
    const admin = await createTestUser({
      role: "ADMIN",
      email: "admin@example.com",
      phone: "+233200000001",
    });

    const asAdmin = await as(admin);
    const asNobody = await request(app).get(url);

    expect(asAdmin.status).toBe(403);
    expect(asNobody.status).toBe(401);
  });
});
