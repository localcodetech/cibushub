import { api } from "@/lib/api";

// Asks the server to check the cart against today's menu [AC-CART-07].
// The cart only remembers choices; the server says what they cost now and whether they can be ordered.
// restaurantId: the cart's restaurant    lines: the cart store's lines
// Returns { restaurant, lines, subtotalPesewas, problems, hasChanges, canCheckout }.
// Its lines come back in the same order we sent them.
export const checkCartRequest = async (restaurantId, lines) => {
  const items = lines.map((line) => ({
    menuItemId: line.menuItemId,
    quantity: line.quantity,
    optionIds: line.options.map((option) => option.id),
    // The price the customer saw, so the server can spot a change
    seenUnitPricePesewas: line.unitPricePesewas,
  }));

  const result = await api.post("/cart/check", { restaurantId, items });
  return result.data;
};
