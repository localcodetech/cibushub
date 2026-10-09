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
