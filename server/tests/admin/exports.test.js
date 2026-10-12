import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { AuditLog, Order, Payment, Refund } from "../../src/models/index.js";
import { signAccessToken } from "../../src/utils/auth/tokens.js";
import { createTestUser } from "../helpers/users.js";
import { createPaidOrder } from "../helpers/orders.js";

// A Friday: the test restaurants are open
const FRIDAY = new Date("2026-10-09T12:00:00Z");
const fridayOnly = { from: "2026-10-09", to: "2026-10-09" };

let admin;

const download = (user, kind, query) =>
  request(app)
    .get("/api/v1/admin/exports/" + kind)
    .query(query)
    .set("Cookie", `access_token=${signAccessToken(user)}`)
    // Keep the body as text (supertest leaves unknown types empty otherwise)
    .buffer(true)
    .parse((res, done) => {
      let text = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => (text += chunk));
      res.on("end", () => done(null, text));
    });

// The file as rows of cells (the test data has no commas or quotes inside cells)
const rowsOf = (csv) =>
  csv
    .replace(/^\uFEFF/, "")
    .trim()
    .split("\r\n")
    .map((line) => line.split(","));

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(FRIDAY);
  admin = await createTestUser({
    role: "ADMIN",
    email: "admin@example.com",
    phone: "+233200000001",
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("CSV exports [AC-ANL-04]", () => {
  it("downloads the orders placed in the range, money in cedis, refunds included", async () => {
    const { order } = await createPaidOrder(1);
    const payment = await Payment.create({
      orderId: order.id,
      reference: "CH-TEST-1",
      amountPesewas: order.totalPesewas,
      status: "SUCCESS",
    });
    await Refund.create({
      orderId: order.id,
      paymentId: payment.id,
      amountPesewas: 1050,
      reason: "Missing drink",
      initiatedByRole: "ADMIN",
      status: "PROCESSED",
    });
    const full = await Order.scope("withEarnings").findByPk(order.id);

    const response = await download(admin, "orders", fridayOnly);
    const [header, row] = rowsOf(response.body);

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/csv");
    expect(response.headers["content-disposition"]).toBe(
      'attachment; filename="cibushub-orders-2026-10-09-to-2026-10-09.csv"',
    );
    expect(response.headers["cache-control"]).toBe("no-store");
    const cell = (name) => row[header.indexOf(name)];
    expect(cell("Order number")).toBe(order.orderNumber);
    expect(cell("Placed at (Ghana time)")).toBe("2026-10-09 12:00:00");
    expect(cell("Food (GHS)")).toBe("60.00");
    expect(cell("Total (GHS)")).toBe((full.totalPesewas / 100).toFixed(2));
    expect(cell("Refunded (GHS)")).toBe("10.50");
    expect(cell("Commission (GHS)")).toBe((full.commissionPesewas / 100).toFixed(2));
    // No phone numbers or emails anywhere in the file
    expect(response.body).not.toMatch(/\+233|@example\.com/);
  });

  it("downloads payment attempts with what was refunded from each", async () => {
    const { order } = await createPaidOrder(1);
    await Payment.create({
      orderId: order.id,
      reference: "CH-TEST-2",
      amountPesewas: 7072,
      status: "FAILED",
    });

    const response = await download(admin, "payments", fridayOnly);
    const [header, row] = rowsOf(response.body);

    expect(header).toEqual([
      "Reference",
      "Started at (Ghana time)",
      "Paid at (Ghana time)",
      "Order number",
      "Provider",
      "Channel",
      "Status",
      "Amount (GHS)",
      "Refunded (GHS)",
    ]);
    expect(row).toEqual([
      "CH-TEST-2",
      "2026-10-09 12:00:00",
      "",
      order.orderNumber,
      "PAYSTACK",
      "",
      "FAILED",
      "70.72",
      "0.00",
    ]);
  });

  it("writes every row of a long export, in batches, and nothing outside the range", async () => {
    const { order } = await createPaidOrder(1);
    // 501 payments: more than one batch of 500
    const rows = Array.from({ length: 501 }, (_, index) => ({
      orderId: order.id,
      reference: "CH-BATCH-" + String(index).padStart(3, "0"),
      amountPesewas: 100,
      status: "ABANDONED",
    }));
    await Payment.bulkCreate(rows);
    vi.setSystemTime(new Date("2026-10-10T12:00:00Z"));
    await Payment.create({ ...rows[0], reference: "CH-NEXT-DAY" });

    const response = await download(admin, "payments", fridayOnly);
    const references = rowsOf(response.body)
      .slice(1)
      .map((row) => row[0]);

    expect(references).toHaveLength(501);
    expect(new Set(references).size).toBe(501);
    expect(references).not.toContain("CH-NEXT-DAY");
  });

  it("records who exported what in the audit log", async () => {
    await createPaidOrder(1);

    await download(admin, "orders", fridayOnly);

    const audit = await AuditLog.findOne({ where: { action: "DATA_EXPORTED" } });
    expect(audit).toMatchObject({ actorId: admin.id, targetType: "user", targetId: admin.id });
    expect(audit.after).toEqual({
      export: "orders",
      from: "2026-10-09",
      to: "2026-10-09",
      rows: 1,
    });
  });

  it("is for admins only, with a valid range", async () => {
    const customer = await createTestUser({ email: "kofi@example.com", phone: "+233200000002" });

    const asCustomer = await download(customer, "orders", fridayOnly);
    const tooLong = await download(admin, "orders", { from: "2026-01-01", to: "2026-10-09" });

    expect(asCustomer.status).toBe(403);
    expect(tooLong.status).toBe(400);
  });
});
