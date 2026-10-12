import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendDailySummary } from "../../src/services/admin/dailySummary.service.js";
import { SCHEDULES } from "../../src/jobs/schedules.js";
import { PROCESSORS } from "../../src/jobs/processors.js";
import { formatGhs } from "../../src/utils/money.js";
import { createTestUser } from "../helpers/users.js";
import { createPaidOrder } from "../helpers/orders.js";
import { sentEmails } from "../helpers/fakeEmail.js";

// A Friday: the test restaurants are open
const FRIDAY_NOON = new Date("2026-10-09T12:00:00Z");
const FRIDAY_2359 = new Date("2026-10-09T23:59:00Z");

const summariesTo = (email) =>
  sentEmails.filter((sent) => sent.to === email && sent.subject.startsWith("CibusHub today"));

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(FRIDAY_NOON);
  await createTestUser({ role: "ADMIN", email: "admin@example.com", phone: "+233200000001" });
  await createTestUser({
    role: "SUPER_ADMIN",
    email: "boss@example.com",
    phone: "+233200000004",
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Daily summary email [AC-JOB-02]", () => {
  it("emails every admin the day's orders and money", async () => {
    const { order } = await createPaidOrder(1);
    vi.setSystemTime(FRIDAY_2359);

    await sendDailySummary(FRIDAY_2359);

    for (const email of ["admin@example.com", "boss@example.com"]) {
      const [summary] = summariesTo(email);
      expect(summary.subject).toBe(`CibusHub today: 1 order, ${formatGhs(order.totalPesewas)}`);
      expect(summary.text).toContain("Fri, 9 Oct 2026");
      expect(summary.text).toContain("Auntie Esi's Kitchen");
    }
  });

  it("sends each admin only one summary a day, even if the job runs twice [AC-JOB-03]", async () => {
    await sendDailySummary(FRIDAY_2359);
    await sendDailySummary(FRIDAY_2359);

    expect(summariesTo("admin@example.com")).toHaveLength(1);
  });

  it("is scheduled for 23:59 Ghana time and has a processor", () => {
    const schedule = SCHEDULES.find((item) => item.id === "daily-admin-summary");

    expect(schedule.repeat).toEqual({ pattern: "59 23 * * *", tz: "Africa/Accra" });
    expect(PROCESSORS[schedule.name]).toBeTypeOf("function");
  });
});
