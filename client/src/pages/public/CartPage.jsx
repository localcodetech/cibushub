import { Link } from "react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ShoppingBag, Store } from "lucide-react";
import Container from "@/layouts/Container";
import Text from "@/components/typography/Text";
import Card from "@/components/common/Card";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import CartLineRow from "@/components/cart/CartLineRow";
import { checkCartRequest } from "@/api/cart";
import { getSubtotal, useCartStore } from "@/store/cartStore";
import { formatMoney } from "@/utils/money";
import PageHeader from "@/components/common/PageHeader";

// /cart: what the customer chose, checked against today's menu [AC-CART-03, 07, 08].
// Open to guests too; checkout will ask them to log in.
const CartPage = () => {
  const restaurant = useCartStore((state) => state.restaurant);
  const lines = useCartStore((state) => state.lines);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeLine = useCartStore((state) => state.removeLine);
  const acceptNewPrice = useCartStore((state) => state.acceptNewPrice);

  // Ask the server about this cart. The key holds the whole cart, so any change
  // (quantity, remove, accepted price) checks again [AC-CART-07].
  const { data, error, isFetching, refetch } = useQuery({
    queryKey: ["cart-check", restaurant ? restaurant.id : null, lines],
    queryFn: () => checkCartRequest(restaurant.id, lines),
    // An empty cart has nothing to check
    enabled: lines.length > 0,
    // Keep the last answer on screen while the new one loads, so warnings don't flicker
    placeholderData: keepPreviousData,
  });

  if (lines.length === 0) {
    return (
      <Container>
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          message="Find a restaurant and add something tasty."
          action={{ label: "Browse restaurants", to: "/restaurants" }}
        />
      </Container>
    );
  }

  // Trust the server's subtotal once it has answered; until then, show what the customer saw
  const subtotal = data ? data.subtotalPesewas : getSubtotal(lines);
  const minOrder = restaurant.minOrderPesewas;
  const amountStillNeeded = minOrder - subtotal;
  const restaurantProblems = data ? data.problems : [];
  // Checkout only when the server says nothing changed, and not while a new check is running
  const canCheckout = data && data.canCheckout && !isFetching;

  return (
    <Container>
      <section className="mx-auto max-w-2xl py-8">
        <PageHeader
          back={{ to: "/restaurants/" + restaurant.id, label: restaurant.name }}
          title="Your cart"
        />
        <Text muted className="mt-1">
          From{" "}
          <Link to={"/restaurants/" + restaurant.id} className="font-bold text-primary underline">
            {restaurant.name}
          </Link>
        </Text>

        {/* Closed or gone restaurant. Below minimum has its own message further down */}
        {restaurantProblems
          .filter((problem) => problem.code !== "BELOW_MINIMUM_ORDER")
          .map((problem) => (
            <div
              key={problem.code}
              role="alert"
              className="mt-4 flex items-center gap-2 rounded-md bg-destructive/10 px-4 py-3 text-[15px]"
            >
              <Store size={18} className="shrink-0 text-destructive" aria-hidden="true" />
              {problem.message}
            </div>
          ))}

        {error && (
          <div className="mt-4">
            <ErrorState message={error.message} onRetry={refetch} />
          </div>
        )}

        <ul className="mt-4 divide-y divide-border">
          {lines.map((line) => {
            const checked = findCheckedLine(data, line);

            return (
              <CartLineRow
                key={line.lineId}
                line={line}
                checked={checked}
                onQuantityChange={(quantity) => setQuantity(line.lineId, quantity)}
                onRemove={() => removeLine(line.lineId)}
                onAcceptPrice={() => acceptNewPrice(line.lineId, checked.unitPricePesewas)}
              />
            );
          })}
        </ul>

        <Card className="mt-6">
          <div className="flex items-center justify-between">
            <Text className="font-bold">Subtotal</Text>
            <Text className="font-bold">{formatMoney(subtotal)}</Text>
          </div>
          <Text size="caption" muted className="mt-1">
            Delivery fee and service fee are added at checkout.
          </Text>

          {/* "Add GHS 5.00 more to order" [AC-CART-08] */}
          {amountStillNeeded > 0 && (
            <p role="status" className="mt-3 text-[15px] font-bold text-destructive">
              The minimum order is {formatMoney(minOrder)}. Add {formatMoney(amountStillNeeded)}{" "}
              more to order.
            </p>
          )}

          {/* A disabled link isn't possible in HTML, so it is a link only when checkout is allowed */}
          {canCheckout ? (
            <Link
              to="/checkout"
              className="mt-4 flex min-h-12 items-center justify-center rounded-md bg-primary font-bold text-primary-foreground"
            >
              Go to checkout
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="mt-4 min-h-12 w-full rounded-md bg-primary font-bold text-primary-foreground opacity-40"
            >
              {isFetching ? "Checking your cart…" : "Go to checkout"}
            </button>
          )}
        </Card>
      </section>
    </Container>
  );
};

// The server's answer for one cart line: same dish and same options.
// (Matching by position could pick the wrong line for a moment after one is removed.)
const findCheckedLine = (data, line) => {
  if (!data) {
    return undefined;
  }

  const optionKey = line.options
    .map((option) => option.id)
    .sort()
    .join(",");

  return data.lines.find(
    (checked) =>
      checked.menuItemId === line.menuItemId &&
      [...checked.optionIds].sort().join(",") === optionKey,
  );
};

export default CartPage;
