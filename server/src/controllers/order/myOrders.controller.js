import { cancelMyOrder, getMyOrder, listMyOrders } from "../../services/order/myOrders.service.js";
import { getMyReceipt } from "../../services/order/receipt.service.js";
import { buildReceiptPdf } from "../../services/order/receiptPdf.service.js";
import { sendSuccess } from "../../utils/response.js";

export const listOrders = async (req, res) => {
  const { orders, meta } = await listMyOrders(req.user.id, req.validated.query);

  return sendSuccess(res, orders, 200, meta);
};

export const getOrder = async (req, res) => {
  const order = await getMyOrder(req.user.id, req.params.orderId);

  return sendSuccess(res, order);
};

export const cancelOrder = async (req, res) => {
  const order = await cancelMyOrder(req.user.id, req.params.orderId, req.validated.body.reason);

  return sendSuccess(res, order);
};

export const getReceipt = async (req, res) => {
  const receipt = await getMyReceipt(req.user.id, req.params.orderId);

  return sendSuccess(res, receipt);
};

// The same receipt as a PDF file. "attachment" tells the browser to download it, not open it
export const downloadReceiptPdf = async (req, res) => {
  const receipt = await getMyReceipt(req.user.id, req.params.orderId);
  const pdf = await buildReceiptPdf(receipt);

  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="CibusHub-receipt-${receipt.orderNumber}.pdf"`,
    // A receipt is personal: browsers and proxies must not keep a copy
    "Cache-Control": "no-store",
  });
  return res.send(pdf);
};
