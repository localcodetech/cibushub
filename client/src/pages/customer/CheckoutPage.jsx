import { useState } from "react";
import { Link } from "react-router";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CircleCheck,
  LoaderCircle,
  MapPinned,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import Card from "@/components/common/Card";
import Skeleton from "@/components/common/Skeleton";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import AddressPicker from "@/components/checkout/AddressPicker";
import OrderSummary from "@/components/checkout/OrderSummary";
import { getAddressesRequest } from "@/api/addresses";
import { getCheckoutQuoteRequest, placeOrderRequest, startPaymentRequest } from "@/api/orders";
import { makeIdempotencyKey } from "@/lib/idempotencyKey";
import { useCartStore } from "@/store/cartStore";
import { formatMoney } from "@/utils/money";

const NOTE_MAX = 500;

// /checkout: where to deliver, notes, and the server's final price [AC-CHK-01 to 04, AC-CHK-10].
// Every number on this page comes from the server's quote, never from the cart.
const CheckoutPage = () => {
  const restaurant = useCartStore((state) => state.restaurant);
  const lines = useCartStore((state) => state.lines);
  const clearCart = useCartStore((state) => state.clearCart);
  const queryClient = useQueryClient();

  // The address the customer picked. null means "use the default" (the first in the list)
  const [chosenAddressId, setChosenAddressId] = useState(null);
  const [restaurantNote, setRestaurantNote] = useState("");
  const [riderNote, setRiderNote] = useState("");

  // One key for this checkout. A double tap or a retry sends the same key,
  // so the server returns the same order instead of making two [AC-CHK-09].
  // useState(fn) runs fn once, when the page opens.
  const [idempotencyKey] = useState(makeIdempotencyKey);
  // true from the tap until we leave for Paystack (or something fails)
  const [isPlacing, setIsPlacing] = useState(false);
  const [placeError, setPlaceError] = useState("");
  // The saved order, once the server has created it
  const [placedOrder, setPlacedOrder] = useState(null);

  const addressesQuery = useQuery({
    queryKey: ["addresses"],
    queryFn: getAddressesRequest,
  });

  const addresses = addressesQuery.data;
  // The list comes default-first, so the first one is the default [AC-CUST-07]
  let addressId = chosenAddressId;
  if (!addressId && addresses && addresses.length > 0) {
    addressId = addresses[0].id;
  }

  // Ask the server for the price. A new address or a cart change asks again
  const quoteQuery = useQuery({
    queryKey: ["checkout-quote", restaurant ? restaurant.id : null, addressId, lines],
    queryFn: () =>
      getCheckoutQuoteRequest({ restaurantId: restaurant.id, addressId: addressId, lines: lines }),
    enabled: Boolean(restaurant && addressId && lines.length > 0),
    placeholderData: keepPreviousData,
  });

  // Ask Paystack for a payment page, then leave our site for it [AC-PAY-01].
  // Paystack sends the customer back to /orders/:id/payment when they finish.
  const goToPayment = async (order) => {
    setIsPlacing(true);
    setPlaceError("");
    try {
      const payment = await startPaymentRequest(order.id);
      // assign() opens the page like clicking a link; we don't set isPlacing back, we are leaving
      window.location.assign(payment.authorizationUrl);
    } catch (error) {
      setPlaceError(error.message);
      setIsPlacing(false);
    }
  };

  const handlePlaceOrder = async () => {
    setIsPlacing(true);
    setPlaceError("");

    let order;
    try {
      order = await placeOrderRequest(
        {
          restaurantId: restaurant.id,
          addressId: addressId,
          lines: lines,
          restaurantNote: restaurantNote.trim(),
          riderNote: riderNote.trim(),
        },
        idempotencyKey,
      );
    } catch (error) {
      setIsPlacing(false);
      setPlaceError(error.message);
      // Something changed (price, stock, closed): get a fresh quote so the page shows what [AC-CHK-05]
      if (error.code === "CHECKOUT_BLOCKED") {
        quoteQuery.refetch();
      }
      return;
    }

    // The order is saved. The cart has done its job; the order now holds the copy.
    setPlacedOrder(order);
    clearCart();
    queryClient.invalidateQueries({ queryKey: ["orders"] });

    await goToPayment(order);
  };

  // ── Order placed: on the way to Paystack, or payment couldn't start ──
  // (Checked before "cart is empty", because the cart was just emptied on purpose.)
  if (placedOrder) {
    return (
      <CheckoutLayout>
        <PlacedOrderPanel
          order={placedOrder}
          isLeaving={isPlacing}
          error={placeError}
          onRetryPayment={() => goToPayment(placedOrder)}
        />
      </CheckoutLayout>
    );
  }

  // ── Nothing to check out ──
  if (lines.length === 0) {
    return (
      <CheckoutLayout>
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          message="Add some food before checking out."
          action={{ label: "Browse restaurants", to: "/restaurants" }}
        />
      </CheckoutLayout>
    );
  }

  // ── Addresses loading or failed ──
  if (addressesQuery.isPending) {
    return (
      <CheckoutLayout>
        <CheckoutSkeleton />
      </CheckoutLayout>
    );
  }
  if (addressesQuery.error) {
    return (
      <CheckoutLayout>
        <ErrorState message={addressesQuery.error.message} onRetry={addressesQuery.refetch} />
      </CheckoutLayout>
    );
  }

  // ── No address yet: one is needed before anything can be priced ──
  if (addresses.length === 0) {
    return (
      <CheckoutLayout>
        <EmptyState
          icon={MapPinned}
          title="Where should we deliver?"
          message="Add a delivery address with a map pin, then come back to finish your order."
        />
        <div className="text-center">
          <Link
            to="/customer/addresses/new"
            state={{ returnTo: "/checkout" }}
            className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 font-bold text-primary-foreground"
          >
            Add an address
          </Link>
        </div>
      </CheckoutLayout>
    );
  }

  const quote = quoteQuery.data;
  // A cart line changed (price, sold out, options): fix it in the cart first [AC-CART-07]
  const hasLineProblems = quote && quote.lines.some((line) => line.problems.length > 0);
  const canPlaceOrder = quote && quote.canPlaceOrder && !quoteQuery.isFetching;

  return (
    <CheckoutLayout>
      <Text muted className="-mt-4 mb-6">
        From <span className="font-bold text-foreground">{restaurant.name}</span>
      </Text>

      <div className="space-y-8">
        <AddressPicker addresses={addresses} selectedId={addressId} onSelect={setChosenAddressId} />

        {/* Problems the server found: out of range, closed, below minimum... [AC-CHK-04] */}
        {quote && quote.problems.length > 0 && (
          <div role="alert" className="space-y-2">
            {quote.problems.map((problem) => (
              <ProblemBanner key={problem.code} message={problemMessage(problem, quote)} />
            ))}
          </div>
        )}

        {hasLineProblems && (
          <ProblemBanner message="Something in your cart changed since you added it.">
            <Link to="/cart" className="font-bold text-primary underline">
              Review cart
            </Link>
          </ProblemBanner>
        )}

        {quoteQuery.error && (
          <ErrorState message={quoteQuery.error.message} onRetry={quoteQuery.refetch} />
        )}

        {quoteQuery.isPending && !quoteQuery.error && <Skeleton className="h-48 w-full" />}

        {quote && <OrderSummary quote={quote} />}

        {/* Two separate notes [AC-CHK-10] */}
        <section className="space-y-4">
          <NoteField
            id="restaurantNote"
            label="Note for the kitchen (optional)"
            placeholder="e.g. Less pepper, no onions"
            value={restaurantNote}
            onChange={setRestaurantNote}
          />
          <NoteField
            id="riderNote"
            label="Note for the rider, this order only (optional)"
            placeholder="e.g. I'm at the back entrance today"
            value={riderNote}
            onChange={setRiderNote}
          />
        </section>

        {quote && (
          <Card>
            <p className="font-bold">Contact phone</p>
            <p className="mt-1 text-[15px] text-muted-foreground">
              The rider will call {quote.contactPhone} if needed.
            </p>
            <div className="mt-4 flex items-start gap-2">
              <Wallet size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
              <p className="text-[15px]">
                <span className="font-bold">Payment:</span> Mobile Money or card, on the next screen
                (secured by Paystack).
              </p>
            </div>
          </Card>
        )}

        {placeError && (
          <p role="alert" className="text-[15px] text-destructive">
            {placeError}
          </p>
        )}

        {/* Disabled while sending, so a second tap can't start a second request [AC-CHK-09] */}
        <button
          type="button"
          onClick={handlePlaceOrder}
          disabled={!canPlaceOrder || isPlacing}
          className="min-h-12 w-full rounded-md bg-primary px-5 font-bold text-primary-foreground disabled:opacity-40"
        >
          {isPlacing && "Placing order…"}
          {!isPlacing && quote && "Place order · " + formatMoney(quote.totalPesewas)}
          {!isPlacing && !quote && "Place order"}
        </button>
      </div>
    </CheckoutLayout>
  );
};

// After the order is saved: "Taking you to Paystack…", or a "Pay" button if starting payment failed.
// The order is safe either way; it waits as "pending payment" until paid or it expires.
const PlacedOrderPanel = ({ order, isLeaving, error, onRetryPayment }) => {
  return (
    <Card className="text-center">
      <CircleCheck size={40} className="mx-auto text-primary" aria-hidden="true" />
      <p className="mt-3 font-heading text-lg font-bold">Order {order.orderNumber} placed</p>

      {isLeaving && (
        <p role="status" className="mt-2 inline-flex items-center gap-2 text-muted-foreground">
          <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
          Taking you to the payment page…
        </p>
      )}

      {!isLeaving && error && (
        <>
          <p role="alert" className="mt-2 text-[15px] text-destructive">
            {error}
          </p>
          <button
            type="button"
            onClick={onRetryPayment}
            className="mt-4 min-h-12 w-full rounded-md bg-primary px-5 font-bold text-primary-foreground"
          >
            Pay {formatMoney(order.totalPesewas)}
          </button>
        </>
      )}
    </Card>
  );
};

// Friendlier words for the server's problem codes. The server's own message is the fallback.
const problemMessage = (problem, quote) => {
  if (problem.code === "BELOW_MINIMUM_ORDER") {
    const stillNeeded = quote.restaurant.minOrderPesewas - quote.subtotalPesewas;
    return "Add " + formatMoney(stillNeeded) + " more to reach the minimum order.";
  }
  if (problem.code === "OUT_OF_DELIVERY_RANGE") {
    return problem.message + ". Choose a closer address.";
  }
  return problem.message;
};

// A red box with a warning icon, and an optional link after the message
const ProblemBanner = ({ message, children }) => {
  return (
    <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-4 py-3 text-[15px]">
      <AlertTriangle size={18} className="mt-0.5 shrink-0 text-destructive" aria-hidden="true" />
      <p>
        {message} {children}
      </p>
    </div>
  );
};

// A labelled text box for a short note
const NoteField = ({ id, label, placeholder, value, onChange }) => {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[15px] font-bold">
        {label}
      </label>
      <textarea
        id={id}
        rows={2}
        maxLength={NOTE_MAX}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-input bg-white px-3.5 py-3 text-base dark:bg-card"
      />
    </div>
  );
};

const CheckoutSkeleton = () => {
  return (
    <div role="status" className="space-y-4">
      <span className="sr-only">Loading checkout</span>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
};

const CheckoutLayout = ({ children }) => {
  return (
    <Container>
      <section className="mx-auto max-w-xl py-8">
        <Heading level={1} className="mb-6">
          Checkout
        </Heading>
        {children}
      </section>
    </Container>
  );
};

export default CheckoutPage;
