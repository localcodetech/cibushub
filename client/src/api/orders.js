import { api, downloadFile } from "@/lib/api";

// Every call to the customer's /orders endpoints lives here.

// The receipt of one of my paid orders [AC-PAY-15, AC-PAY-17].
// Returns { orderNumber, restaurantName, paidAt, paymentMethod, paymentReference, items,
//           subtotalPesewas, deliveryFeePesewas, serviceFeePesewas, discountPesewas, totalPesewas }
// 404 if the order isn't mine; 409 RECEIPT_NOT_AVAILABLE if it isn't paid yet.
export const getReceiptRequest = async (orderId) => {
  const result = await api.get("/customer/orders/" + orderId + "/receipt");
  return result.data;
};

// The cart in the shape the server expects: what was chosen, never prices to trust [AC-CHK-02]
const toServerItems = (lines) => {
  return lines.map((line) => ({
    menuItemId: line.menuItemId,
    quantity: line.quantity,
    optionIds: line.options.map((option) => option.id),
    seenUnitPricePesewas: line.unitPricePesewas,
  }));
};

// The checkout summary, worked out by the server: items, fees, total, address, contact phone,
// problems and canPlaceOrder [AC-CHK-01, AC-CHK-03, AC-CHK-04].
// order = { restaurantId, addressId, lines, restaurantNote?, riderNote? }
export const getCheckoutQuoteRequest = async (order) => {
  const result = await api.post("/customer/checkout/quote", {
    restaurantId: order.restaurantId,
    addressId: order.addressId,
    items: toServerItems(order.lines),
  });
  return result.data;
};

// Places the order. The server prices it again and saves it as PENDING_PAYMENT [AC-CHK-05, 06, 09].
// idempotencyKey: the same key for retries of the same tap, so only one order is ever made.
// Returns the order: { id, orderNumber, status, totalPesewas, ... }
// 409 CHECKOUT_BLOCKED (with error.details listing each problem) if something changed.
export const placeOrderRequest = async (order, idempotencyKey) => {
  const body = {
    restaurantId: order.restaurantId,
    addressId: order.addressId,
    items: toServerItems(order.lines),
  };
  // Optional notes are left out when empty; the server refuses empty text
  if (order.restaurantNote) body.restaurantNote = order.restaurantNote;
  if (order.riderNote) body.riderNote = order.riderNote;
  // The total the page showed: if fees changed meanwhile, the server stops the order and the
  // page shows the new total first (plan-review C14)
  if (order.seenTotalPesewas !== undefined) body.seenTotalPesewas = order.seenTotalPesewas;

  const result = await api.post("/customer/orders", body, { "Idempotency-Key": idempotencyKey });
  return result.data;
};

// Starts (or retries) paying with Paystack [AC-PAY-01].
// Returns { authorizationUrl, reference, amountPesewas }: send the customer to authorizationUrl.
export const startPaymentRequest = async (orderId) => {
  const result = await api.post("/customer/orders/" + orderId + "/payments");
  return result.data;
};

// Has my payment gone through? The server asks Paystack itself; the browser never decides [AC-PAY-09].
// Returns { state, message, orderId, orderNumber, orderStatus, totalPesewas }.
// state: PAID, PENDING, NOT_COMPLETED, FAILED, PROBLEM, CLOSED or NOT_STARTED
export const getPaymentStatusRequest = async (orderId) => {
  const result = await api.get("/customer/orders/" + orderId + "/payment-status");
  return result.data;
};

// Saves the receipt as a PDF file on the device, made by the server [AC-PAY-17]
export const downloadReceiptPdfRequest = async (orderId, orderNumber) => {
  await downloadFile(
    "/customer/orders/" + orderId + "/receipt/pdf",
    "CibusHub-receipt-" + orderNumber + ".pdf",
  );
};

// One page of my orders, newest first [AC-CUST-09].
// Returns { orders: [{ id, orderNumber, status, totalPesewas, createdAt, restaurant }], meta }
export const getMyOrdersRequest = async (page) => {
  const result = await api.get("/customer/orders?page=" + page);
  return { orders: result.data, meta: result.meta };
};

// One of my orders with items, timeline, refunds and what I can still do [AC-ORD-06].
// customerActions is ["CANCELLED"] while I may still cancel, [] after the restaurant accepts.
export const getMyOrderRequest = async (orderId) => {
  const result = await api.get("/customer/orders/" + orderId);
  return result.data;
};

// Cancels before the restaurant accepts. If it was paid, the server starts a full refund
// [AC-CANC-01]. Returns the updated order.
export const cancelOrderRequest = async (orderId, reason) => {
  const result = await api.post("/customer/orders/" + orderId + "/cancel", { reason });
  return result.data;
};

// Live tracking of one of my orders [AC-RT-04]: { status, isTracked, restaurant, dropoff,
// rider: { firstName, photoUrl, vehicleType, plateNumber } | null,
// riderLocation: { latitude, longitude, at } | null, etaMinutes, etaBasis }
export const getOrderTrackingRequest = async (orderId) => {
  const result = await api.get("/customer/orders/" + orderId + "/tracking");
  return result.data;
};

// "I've received my food": only after the rider's code tries locked [AC-DEL-06].
// Returns the updated (DELIVERED) order.
export const confirmReceivedRequest = async (orderId) => {
  const result = await api.post("/customer/orders/" + orderId + "/confirm-received");
  return result.data;
};
