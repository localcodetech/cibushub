import { create } from "zustand";
import { persist } from "zustand/middleware";

// The cart: what the customer chose, kept on this device [AC-CART-01 to 05].
// It only REMEMBERS choices. Prices here are what the customer saw; the server
// checks them again before checkout and is the only source of truth [AC-CART-07].
//
// In a page:  const lines = useCartStore((state) => state.lines);
//             const addLine = useCartStore((state) => state.addLine);

const MAX_QUANTITY = 50;

// The same dish with the same options is one line; different options make a new line [AC-CART-04].
// Jollof + Chicken + Egg -> "jollofId:chickenId,eggId". Sorted, so the order chosen doesn't matter.
const makeLineId = (menuItemId, options) => {
  const optionIds = options.map((option) => option.id).sort();
  return menuItemId + ":" + optionIds.join(",");
};

// A number between 1 and 50
const clampQuantity = (quantity) => {
  return Math.min(MAX_QUANTITY, Math.max(1, quantity));
};

export const useCartStore = create(
  // persist saves the cart in localStorage and loads it back after a refresh [AC-CART-05].
  // That is fine here: a cart is not secret (login tokens never go in localStorage).
  persist(
    (set) => ({
      // { id, name, minOrderPesewas } of the restaurant the cart belongs to, or null when empty
      restaurant: null,

      // One entry per cart line:
      // { lineId, menuItemId, name, imageUrl, options: [{ id, name, extraPricePesewas }],
      //   unitPricePesewas (dish + options, for ONE), quantity }
      lines: [],

      // Adds a dish. The page must check isFromAnotherRestaurant first and ask the customer [AC-CART-02].
      // restaurant: { id, name, minOrderPesewas }
      // item:       the dish from the menu
      // options:    the chosen options, e.g. [{ id, name, extraPricePesewas }]
      addLine: (restaurant, item, options, quantity) => {
        const lineId = makeLineId(item.id, options);

        set((state) => {
          const existing = state.lines.find((line) => line.lineId === lineId);

          // Same dish, same options: add to that line's quantity [AC-CART-04]
          if (existing) {
            const lines = state.lines.map((line) => {
              if (line.lineId !== lineId) {
                return line;
              }
              return { ...line, quantity: clampQuantity(line.quantity + quantity) };
            });
            return { lines: lines };
          }

          // A new line. Its price for one = the dish + every option's extra price
          let unitPricePesewas = item.pricePesewas;
          for (const option of options) {
            unitPricePesewas += option.extraPricePesewas;
          }

          const newLine = {
            lineId: lineId,
            menuItemId: item.id,
            name: item.name,
            imageUrl: item.imageUrl,
            options: options.map((option) => ({
              id: option.id,
              name: option.name,
              extraPricePesewas: option.extraPricePesewas,
            })),
            unitPricePesewas: unitPricePesewas,
            quantity: clampQuantity(quantity),
          };

          return {
            restaurant: {
              id: restaurant.id,
              name: restaurant.name,
              minOrderPesewas: restaurant.minOrderPesewas,
            },
            lines: [...state.lines, newLine],
          };
        });
      },

      // The quantity stepper: any number is kept between 1 and 50 [AC-CART-03]
      setQuantity: (lineId, quantity) => {
        set((state) => ({
          lines: state.lines.map((line) => {
            if (line.lineId !== lineId) {
              return line;
            }
            return { ...line, quantity: clampQuantity(quantity) };
          }),
        }));
      },

      // Removes one line. The last line gone means the cart belongs to no restaurant
      removeLine: (lineId) => {
        set((state) => {
          const lines = state.lines.filter((line) => line.lineId !== lineId);
          if (lines.length === 0) {
            return { lines: [], restaurant: null };
          }
          return { lines: lines };
        });
      },

      // Empties the cart: "Start new cart", or after the order is placed
      clearCart: () => {
        set({ lines: [], restaurant: null });
      },
    }),
    {
      // The localStorage key. version lets us throw away old carts if this shape ever changes.
      name: "cibushub-cart",
      version: 1,
    },
  ),
);

// ── Small helpers that work out numbers from the cart. Use them with the store's values. ──

// How many dishes in total (2 jollof + 1 kelewele = 3), for the badge on the cart icon
export const countItems = (lines) => {
  let count = 0;
  for (const line of lines) {
    count += line.quantity;
  }
  return count;
};

// Total in pesewas before delivery and fees. Whole numbers only [AC-GLOBAL-08]
export const getSubtotal = (lines) => {
  let subtotal = 0;
  for (const line of lines) {
    subtotal += line.unitPricePesewas * line.quantity;
  }
  return subtotal;
};

// true if the cart already holds another restaurant's food [AC-CART-02]
export const isFromAnotherRestaurant = (cartRestaurant, restaurantId) => {
  return cartRestaurant !== null && cartRestaurant.id !== restaurantId;
};
