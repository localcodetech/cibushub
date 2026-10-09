import { Link } from "react-router";
import { countItems, getSubtotal, useCartStore } from "@/store/cartStore";
import { formatMoney } from "@/utils/money";

// A bar fixed to the bottom of a restaurant page once its food is in the cart:
// "View cart · 3 items · GHS 135.00" [AC-CART-01].
// restaurantId: the restaurant page we are on. The bar only shows for that restaurant's cart.
const ViewCartBar = ({ restaurantId }) => {
  const cartRestaurant = useCartStore((state) => state.restaurant);
  const lines = useCartStore((state) => state.lines);

  if (!cartRestaurant || cartRestaurant.id !== restaurantId) {
    return null;
  }

  const itemCount = countItems(lines);

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background p-3">
      <Link
        to="/cart"
        className="mx-auto flex min-h-12 max-w-lg items-center justify-between rounded-md bg-primary px-5 font-bold text-primary-foreground"
      >
        <span>
          View cart · {itemCount} {itemCount === 1 ? "item" : "items"}
        </span>
        <span>{formatMoney(getSubtotal(lines))}</span>
      </Link>
    </div>
  );
};

export default ViewCartBar;
