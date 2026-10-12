import { exportFileName, writeExport } from "../../services/admin/adminExport.service.js";

// Sends a CSV download (orders or payments) [AC-ANL-04]
const sendExport = (kind) => async (req, res) => {
  const range = req.validated.query;

  res.set({
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${exportFileName(kind, range)}"`,
    // Money and order data: never kept by the browser or any cache on the way
    "Cache-Control": "no-store",
  });
  // The byte-order mark tells Excel the file is UTF-8 (names like "Adɔm" stay right)
  res.write("\uFEFF");
  await writeExport({ id: req.user.id, ipAddress: req.ip }, kind, range, (text) => res.write(text));
  res.end();
};

export const exportOrders = sendExport("orders");
export const exportPayments = sendExport("payments");
