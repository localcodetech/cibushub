import { saveAuditLog } from "../../repositories/auditLog.repository.js";
import {
  findOrdersForExport,
  findPaymentsForExport,
} from "../../repositories/adminExport.repository.js";
import { cedisText, csvRow } from "../../utils/export/csv.js";

const DAY_MS = 24 * 60 * 60 * 1000;
// Rows read from MySQL at a time: memory stays small however long the range
const BATCH_SIZE = 500;

// What each export holds: its columns (header and how to fill each from a row) and its query.
// Money is in cedis ("70.72"), times in Ghana time. No phone numbers or emails [AC-SEC-11].
export const EXPORTS = {
  orders: {
    find: findOrdersForExport,
    columns: [
      ["Order number", (row) => row.orderNumber],
      ["Placed at (Ghana time)", (row) => row.placedAt],
      ["Restaurant", (row) => row.restaurant],
      ["Status", (row) => row.status],
      ["Payment method", (row) => row.paymentMethod],
      ["Payment status", (row) => row.paymentStatus],
      ["Food (GHS)", (row) => cedisText(row.subtotal)],
      ["Delivery fee (GHS)", (row) => cedisText(row.deliveryFee)],
      ["Service fee (GHS)", (row) => cedisText(row.serviceFee)],
      ["Discount (GHS)", (row) => cedisText(row.discount)],
      ["Total (GHS)", (row) => cedisText(row.total)],
      ["Refunded (GHS)", (row) => cedisText(row.refunded)],
      ["Commission (GHS)", (row) => cedisText(row.commission)],
      ["Restaurant earnings (GHS)", (row) => cedisText(row.restaurantEarnings)],
      ["Rider earnings (GHS)", (row) => cedisText(row.riderEarnings)],
      ["Delivery area", (row) => row.deliveryArea],
    ],
  },
  payments: {
    find: findPaymentsForExport,
    columns: [
      ["Reference", (row) => row.reference],
      ["Started at (Ghana time)", (row) => row.startedAt],
      ["Paid at (Ghana time)", (row) => row.paidAt],
      ["Order number", (row) => row.orderNumber],
      ["Provider", (row) => row.provider],
      ["Channel", (row) => row.channel],
      ["Status", (row) => row.status],
      ["Amount (GHS)", (row) => cedisText(row.amount)],
      ["Refunded (GHS)", (row) => cedisText(row.refunded)],
    ],
  },
};

// "cibushub-orders-2026-10-01-to-2026-10-12.csv"
export const exportFileName = (kind, { from, to }) =>
  "cibushub-" + kind + "-" + from + "-to-" + to + ".csv";

// Writes one export, batch by batch, through write(text) [AC-ANL-04]; then records who
// exported what in the audit log [AC-ADM-07]. Returns how many rows were written.
//   kind: "orders" or "payments"; from, to: Ghana days, both included
export const writeExport = async (admin, kind, { from, to }, write) => {
  const { find, columns } = EXPORTS[kind];
  const rangeStart = new Date(from + "T00:00:00.000Z");
  const rangeEnd = new Date(new Date(to + "T00:00:00.000Z").getTime() + DAY_MS);

  write(csvRow(columns.map(([header]) => header)));

  let rowCount = 0;
  let after = null;
  for (;;) {
    const rows = await find({ from: rangeStart, to: rangeEnd, after, limit: BATCH_SIZE });
    for (const row of rows) {
      write(csvRow(columns.map(([, value]) => value(row))));
    }
    rowCount += rows.length;
    if (rows.length < BATCH_SIZE) break;
    after = { createdAt: rows.at(-1).createdAt, id: rows.at(-1).id };
  }

  // On the admin's own record: exports carry money and order data out of the system
  await saveAuditLog({
    actorId: admin.id,
    action: "DATA_EXPORTED",
    targetType: "user",
    targetId: admin.id,
    after: { export: kind, from, to, rows: rowCount },
    ipAddress: admin.ipAddress,
  });
  return rowCount;
};
