import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Phone, ReceiptText, RotateCcw } from "lucide-react";
import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import Card from "@/components/common/Card";
import Skeleton from "@/components/common/Skeleton";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import OrderStatusBadge from "@/components/order/OrderStatusBadge";
import OrderTimeline from "@/components/order/OrderTimeline";
import LiveTracking from "@/components/order/LiveTracking";
import CancelOrderSheet from "@/components/order/CancelOrderSheet";
import ReorderSheet from "@/components/order/ReorderSheet";
import NewCartSheet from "@/components/cart/NewCartSheet";
import ReviewPanel from "@/components/review/ReviewPanel";
import { cancelOrderRequest, getMyOrderRequest } from "@/api/orders";
import { getRestaurantRequest } from "@/api/restaurants";
import { isFromAnotherRestaurant, useCartStore } from "@/store/cartStore";
import { planReorder } from "@/utils/reorder";
import { CONTACT_EMAIL } from "@/data/legal/legalInfo";
import { FINISHED_STATUSES } from "@/data/orderStatuses";
import { formatMoney } from "@/utils/money";
import { formatDateTime, formatTime } from "@/utils/date";
import { followOrder, onOrderUpdated } from "@/lib/liveUpdates";
import { useConnectionStore } from "@/store/connectionStore";
import PageHeader from "@/components/common/PageHeader";

// Changes normally arrive instantly over the live connection [AC-RT-03].
// Checking now and then is the backup: rarely while live, more often while it is down.
const REFRESH_WHILE_LIVE_MS = 60000;
const REFRESH_WHILE_OFFLINE_MS = 20000;

// While a rider has it, the customer watches them on a map [AC-RT-04]
const TRACKED_STATUSES = ["RIDER_ASSIGNED", "PICKED_UP"];

// While the kitchen works on it, the customer sees when it should be ready [AC-RORD-03]
const SHOW_READY_TIME_FOR = ["ACCEPTED", "PREPARING"];

const REFUND_STATUS_WORDS = {
  PENDING: "started",
  PROCESSED: "sent",
  FAILED: "delayed, our team is on it",
};

// /customer/orders/:orderId: one order with its timeline, and Cancel while allowed
// [AC-CUST-09, AC-ORD-06, AC-CANC-01, AC-CANC-02]
const OrderDetailPage = () => {
  const { orderId } = useParams();
  const queryClient = useQueryClient();
  const isLive = useConnectionStore((state) => state.status === "connected");
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  const cartRestaurant = useCartStore((state) => state.restaurant);
  const addLine = useCartStore((state) => state.addLine);
  const clearCart = useCartStore((state) => state.clearCart);
  const [isReordering, setIsReordering] = useState(false);
  const [reorderError, setReorderError] = useState("");
  // What Reorder did, shown in the sheet: { restaurant, toAdd, skipped }
  const [reorderResult, setReorderResult] = useState(null);
  // A reorder waiting for "Start a new cart?" because the cart has another restaurant's food
  const [waitingReorder, setWaitingReorder] = useState(null);

  const {
    data: order,
    isPending,
    error,
    refetch,
  } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => getMyOrderRequest(orderId),
    // Keep checking until the order is finished
    refetchInterval: (query) => {
      const current = query.state.data;
      if (current && !FINISHED_STATUSES.includes(current.status)) {
        return isLive ? REFRESH_WHILE_LIVE_MS : REFRESH_WHILE_OFFLINE_MS;
      }
      return false;
    },
    retry: (failureCount, error) => error.status !== 404 && failureCount < 3,
  });

  // Live: follow this order, and refetch it the moment the server says it changed.
  // The event is only a nudge; the REST API answers with the real order.
  useEffect(() => {
    const stopFollowing = followOrder(orderId);
    const stopListening = onOrderUpdated((event) => {
      if (event.orderId === orderId) {
        queryClient.invalidateQueries({ queryKey: ["order", orderId] });
        queryClient.invalidateQueries({ queryKey: ["orders"] });
        // e.g. picked up: the map, ETA and code change straight away
        queryClient.invalidateQueries({ queryKey: ["tracking", orderId] });
      }
    });

    return () => {
      stopListening();
      stopFollowing();
    };
  }, [orderId, queryClient]);

  const handleCancel = async (reason) => {
    setIsCancelling(true);
    setCancelError("");
    try {
      const updated = await cancelOrderRequest(orderId, reason);
      // Show the cancelled order straight away, and refresh the list behind it
      queryClient.setQueryData(["order", orderId], updated);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setIsCancelOpen(false);
    } catch (error) {
      // e.g. the restaurant accepted a moment ago: show why, and get the new status
      setCancelError(error.message);
      refetch();
    }
    setIsCancelling(false);
  };

  // Puts every dish we could match into the cart, at today's prices
  const addToCart = (result) => {
    for (const line of result.toAdd) {
      addLine(result.restaurant, line.item, line.options, line.quantity);
    }
    setReorderResult(result);
  };

  // "Reorder" [AC-CUST-10]: match this order against today's menu, then fill the cart
  const handleReorder = async () => {
    setIsReordering(true);
    setReorderError("");

    let restaurant;
    try {
      // fetchQuery uses the saved copy if the restaurant page was opened recently
      restaurant = await queryClient.fetchQuery({
        queryKey: ["restaurant", order.restaurantId],
        queryFn: () => getRestaurantRequest(order.restaurantId),
      });
    } catch (error) {
      setReorderError(
        error.status === 404 ? "This restaurant isn't on CibusHub any more." : error.message,
      );
      setIsReordering(false);
      return;
    }
    setIsReordering(false);

    const plan = planReorder(restaurant, order);
    const result = { restaurant: restaurant, toAdd: plan.toAdd, skipped: plan.skipped };

    // Nothing to add: just explain why
    if (result.toAdd.length === 0) {
      setReorderResult(result);
      return;
    }

    // The cart holds another restaurant's food: ask first [AC-CART-02]
    if (isFromAnotherRestaurant(cartRestaurant, restaurant.id)) {
      setWaitingReorder(result);
      return;
    }

    addToCart(result);
  };

  const handleStartNewCart = () => {
    clearCart();
    addToCart(waitingReorder);
    setWaitingReorder(null);
  };

  if (isPending) {
    return (
      <DetailLayout>
        <div role="status" className="space-y-4">
          <span className="sr-only">Loading order</span>
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </DetailLayout>
    );
  }

  if (error && error.status === 404) {
    return (
      <DetailLayout>
        <EmptyState
          icon={ReceiptText}
          title="Order not found"
          message="It doesn't exist or isn't yours."
          action={{ label: "My orders", to: "/customer/orders" }}
        />
      </DetailLayout>
    );
  }

  if (error) {
    return (
      <DetailLayout>
        <ErrorState message={error.message} onRetry={refetch} />
      </DetailLayout>
    );
  }

  const canCancel = order.customerActions.includes("CANCELLED");
  const isFinished = FINISHED_STATUSES.includes(order.status);
  const wasPaid = order.paymentStatus !== "UNPAID";

  return (
    <DetailLayout>
      <PageHeader
        back={{ to: "/customer/orders", label: "My orders" }}
        title={order.restaurant.name}
        meta={order.orderNumber + " · " + formatDateTime(order.createdAt)}
        badge={<OrderStatusBadge status={order.status} />}
      />

      {/* Wide screens: what's happening on the left; the order, address and buttons on the
          right, staying in view while scrolling. Phones: one column, in this same order. */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-10">
        <div>
          {/* Not paid yet: the way to pay [AC-PAY-10] */}
          {order.status === "PENDING_PAYMENT" && (
            <Card className="mt-6">
              <p className="font-bold">Waiting for payment</p>
              <Text size="small" muted className="mt-1">
                The restaurant gets your order once it is paid. Unpaid orders are cancelled after 30
                minutes.
              </Text>
              <Link
                to={"/orders/" + order.id + "/payment"}
                className="mt-4 flex min-h-12 items-center justify-center rounded-md bg-primary font-bold text-primary-foreground"
              >
                Pay {formatMoney(order.totalPesewas)}
              </Link>
            </Card>
          )}

          {SHOW_READY_TIME_FOR.includes(order.status) && order.estimatedReadyAt && (
            <Card className="mt-6">
              <p className="text-[15px] text-muted-foreground">Food ready around</p>
              <p className="font-heading text-2xl font-bold">
                {formatTime(order.estimatedReadyAt)}
              </p>
            </Card>
          )}

          {/* Delivered: rate the food (and the rider) [AC-REV-01 to 03] */}
          {order.status === "DELIVERED" && <ReviewPanel orderId={order.id} />}

          {/* The rider is on the way: live map, ETA and the delivery code [AC-RT-04] */}
          {TRACKED_STATUSES.includes(order.status) && <LiveTracking order={order} />}

          <section className="mt-8">
            <Heading level={2} className="mb-4">
              Progress
            </Heading>
            <OrderTimeline status={order.status} timeline={order.timeline} />
          </section>

          {/* Money coming back after a cancel or rejection [AC-CANC-04] */}
          {order.refunds.length > 0 && (
            <Card className="mt-4">
              {order.refunds.map((refund) => (
                <p key={refund.id} className="text-[15px]">
                  Refund of <span className="font-bold">{formatMoney(refund.amountPesewas)}</span>{" "}
                  {REFUND_STATUS_WORDS[refund.status] || refund.status}. It usually reaches your
                  account in a few working days.
                </p>
              ))}
            </Card>
          )}
        </div>

        <aside className="lg:sticky lg:top-6 lg:[&>*:first-child]:mt-6">
          <section className="mt-8">
            <Heading level={2}>Your order</Heading>
            <ul className="mt-3 divide-y divide-border border-y border-border">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p>
                      <span className="font-bold">{item.quantity} ×</span> {item.name}
                    </p>
                    {item.options.length > 0 && (
                      <p className="text-[15px] text-muted-foreground">
                        {item.options.map((option) => option.name).join(", ")}
                      </p>
                    )}
                  </div>
                  <p className="shrink-0">{formatMoney(item.lineTotalPesewas)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 text-[15px]">
              <MoneyRow label="Subtotal" pesewas={order.subtotalPesewas} />
              <MoneyRow label="Delivery fee" pesewas={order.deliveryFeePesewas} />
              {order.serviceFeePesewas > 0 && (
                <MoneyRow label="Service fee" pesewas={order.serviceFeePesewas} />
              )}
              {order.discountPesewas > 0 && (
                <MoneyRow label="Discount" pesewas={-order.discountPesewas} />
              )}
              <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
                <dt>Total</dt>
                <dd>{formatMoney(order.totalPesewas)}</dd>
              </div>
            </dl>
          </section>

          {/* Where it goes: the order's own copy of the address [AC-CHK-07] */}
          <Card className="mt-8 space-y-2 text-[15px]">
            <p className="flex items-start gap-2">
              <MapPin size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
              <span>
                {[order.deliveryArea, order.deliveryLandmark].filter(Boolean).join(" · ") ||
                  "Your pinned location"}
              </span>
            </p>
            <p className="flex items-start gap-2">
              <Phone size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
              <span>The rider will call {order.contactPhone}</span>
            </p>
            {order.restaurantNote && (
              <p>
                <span className="font-bold">Kitchen note:</span> {order.restaurantNote}
              </p>
            )}
            {order.riderNote && (
              <p>
                <span className="font-bold">Rider note:</span> {order.riderNote}
              </p>
            )}
          </Card>

          <div className="mt-8 flex flex-col gap-3">
            {/* Only finished, delivered orders can be ordered again [AC-CUST-10] */}
            {order.status === "DELIVERED" && (
              <button
                type="button"
                onClick={handleReorder}
                disabled={isReordering}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-primary font-bold text-primary-foreground disabled:opacity-60"
              >
                <RotateCcw size={18} aria-hidden="true" />
                {isReordering ? "Checking the menu…" : "Reorder"}
              </button>
            )}
            {reorderError && (
              <p role="alert" className="text-center text-[15px] text-destructive">
                {reorderError}
              </p>
            )}

            {wasPaid && (
              <Link
                to={"/customer/orders/" + order.id + "/receipt"}
                className="flex min-h-12 items-center justify-center rounded-md border border-border font-bold"
              >
                View receipt
              </Link>
            )}

            {canCancel && (
              <button
                type="button"
                onClick={() => setIsCancelOpen(true)}
                className="min-h-12 rounded-md border border-destructive font-bold text-destructive"
              >
                Cancel order
              </button>
            )}

            {/* Too late to cancel in the app: who to contact instead [AC-CANC-02] */}
            {!canCancel && !isFinished && (
              <Text size="small" muted className="text-center">
                The restaurant has started on your order, so it can't be cancelled here. Need help?
                Call {order.restaurant.name} on {order.restaurant.phone} or email {CONTACT_EMAIL}.
              </Text>
            )}

            {cancelError && !isCancelOpen && (
              <p role="alert" className="text-center text-[15px] text-destructive">
                {cancelError}
              </p>
            )}
          </div>
        </aside>
      </div>

      {reorderResult && (
        <ReorderSheet result={reorderResult} onClose={() => setReorderResult(null)} />
      )}

      {waitingReorder && (
        <NewCartSheet
          currentName={cartRestaurant.name}
          newName={waitingReorder.restaurant.name}
          onConfirm={handleStartNewCart}
          onClose={() => setWaitingReorder(null)}
        />
      )}

      {isCancelOpen && (
        <CancelOrderSheet
          order={order}
          isCancelling={isCancelling}
          error={cancelError}
          onConfirm={handleCancel}
          onClose={() => {
            setIsCancelOpen(false);
            setCancelError("");
          }}
        />
      )}
    </DetailLayout>
  );
};

// One "label ........ GHS 12.00" line
const MoneyRow = ({ label, pesewas }) => {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{formatMoney(pesewas)}</dd>
    </div>
  );
};

const DetailLayout = ({ children }) => {
  return (
    <Container>
      <section className="mx-auto max-w-2xl py-8 lg:max-w-5xl">{children}</section>
    </Container>
  );
};

export default OrderDetailPage;
