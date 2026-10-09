import { api } from "@/lib/api";

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
