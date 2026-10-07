import AppError from "../../utils/AppError.js";
import { formatGhs } from "../../utils/money.js";
import { findOrderWithDetails } from "../../repositories/order.repository.js";
import { findRestaurantById } from "../../repositories/restaurant.repository.js";
import { findSuccessfulPayment } from "../../repositories/payment.repository.js";

const PAYMENT_METHOD_NAMES = { mobile_money: "Mobile money", card: "Card" };

// Everything a receipt shows, from the order's frozen copy (never today's menu) [AC-PAY-15]
export const buildReceipt = async (orderId) => {
  const order = await findOrderWithDetails(orderId);
  const restaurant = await findRestaurantById(order.restaurantId);
  const payment = await findSuccessfulPayment(order.id);

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerId: order.customerId,
    restaurantName: restaurant.name,
    paidAt: payment ? payment.paidAt : null,
    paymentMethod: payment ? PAYMENT_METHOD_NAMES[payment.channel] || payment.channel : null,
    paymentReference: payment ? payment.reference : null,
    items: order.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      options: item.options.map((option) => option.name),
      unitPricePesewas: item.unitPricePesewas,
      lineTotalPesewas: item.lineTotalPesewas,
    })),
    subtotalPesewas: order.subtotalPesewas,
    deliveryFeePesewas: order.deliveryFeePesewas,
    serviceFeePesewas: order.serviceFeePesewas,
    discountPesewas: order.discountPesewas,
    totalPesewas: order.totalPesewas,
  };
};

// The receipt as plain text, for the email
export const receiptAsText = (receipt) => {
  const lines = receipt.items.map((item) => {
    const extras = item.options.length > 0 ? ` (${item.options.join(", ")})` : "";
    return `${item.quantity} x ${item.name}${extras}: ${formatGhs(item.lineTotalPesewas)}`;
  });

  return [
    `Receipt for order ${receipt.orderNumber} from ${receipt.restaurantName}`,
    "",
    ...lines,
    "",
    `Subtotal: ${formatGhs(receipt.subtotalPesewas)}`,
    `Delivery fee: ${formatGhs(receipt.deliveryFeePesewas)}`,
    `Service fee: ${formatGhs(receipt.serviceFeePesewas)}`,
    `Discount: ${formatGhs(receipt.discountPesewas)}`,
    `Total paid: ${formatGhs(receipt.totalPesewas)}`,
    "",
    `Paid by: ${receipt.paymentMethod}`,
    `Payment reference: ${receipt.paymentReference}`,
  ].join("\n");
};

// A customer viewing the receipt of one of their PAID orders
export const getMyReceipt = async (customerId, orderId) => {
  const order = await findOrderWithDetails(orderId);

  if (!order || order.customerId !== customerId) {
    throw new AppError(404, "NOT_FOUND", "Order not found");
  }

  // Paid, or paid and later refunded: the payment still happened
  if (order.paymentStatus === "UNPAID") {
    throw new AppError(409, "RECEIPT_NOT_AVAILABLE", "This order has not been paid yet");
  }

  return buildReceipt(orderId);
};
