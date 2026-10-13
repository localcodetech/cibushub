import { Link } from "react-router";
import { ShoppingBag } from "lucide-react";
import { countItems, useCartStore } from "@/store/cartStore";

// The bag icon in the navbar with the number of dishes in the cart [AC-CART-01].
// The number is read from the cart store, so it changes the moment something is added.
const CartButton = () => {
  const lines = useCartStore((state) => state.lines);
  const itemCount = countItems(lines);

  return (
    <Link
      to="/cart"
      aria-label={"Cart, " + itemCount + (itemCount === 1 ? " item" : " items")}
      className="relative flex size-11 items-center justify-center rounded-md"
    >
      <ShoppingBag size={22} aria-hidden="true" />
      {/* key: a new count is a new badge, so it pops once each time a dish is added */}
      {itemCount > 0 && (
        <span
          key={itemCount}
          className="absolute top-0.5 right-0.5 flex min-w-5 items-center justify-center rounded-full bg-secondary px-1 text-[12px] font-bold text-secondary-foreground duration-200 animate-in zoom-in-50 motion-reduce:animate-none"
        >
          {itemCount}
        </span>
      )}
    </Link>
  );
};

export default CartButton;
