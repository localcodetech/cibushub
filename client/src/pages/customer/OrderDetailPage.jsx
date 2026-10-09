import { useState } from "react";
import { Link, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Phone, ReceiptText } from "lucide-react";
import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import Card from "@/components/common/Card";
import Skeleton from "@/components/common/Skeleton";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import OrderStatusBadge from "@/components/order/OrderStatusBadge";
import OrderTimeline from "@/components/order/OrderTimeline";
import CancelOrderSheet from "@/components/order/CancelOrderSheet";
import { cancelOrderRequest, getMyOrderRequest } from "@/api/orders";
import { CONTACT_EMAIL } from "@/data/legal/legalInfo";
import { FINISHED_STATUSES } from "@/data/orderStatuses";
import { formatMoney } from "@/utils/money";
import { formatDateTime } from "@/utils/date";

// How often to look for news while the order is still moving.
// (Instant updates arrive with the live connection in Step 10.)
const REFRESH_EVERY_MS = 20000;

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
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

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
        return REFRESH_EVERY_MS;
      }
      return false;
    },
    retry: (failureCount, error) => error.status !== 404 && failureCount < 3,
  });

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
      <Link to="/customer/orders" className="text-[15px] font-bold text-primary">
        ← My orders
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Heading level={1}>{order.restaurant.name}</Heading>
          <Text size="small" muted className="mt-1">
            {order.orderNumber} · {formatDateTime(order.createdAt)}
          </Text>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

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
              {REFUND_STATUS_WORDS[refund.status] || refund.status}. It usually reaches your account
              in a few working days.
            </p>
          ))}
        </Card>
      )}

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
            The restaurant has started on your order, so it can't be cancelled here. Need help? Call{" "}
            {order.restaurant.name} on {order.restaurant.phone} or email {CONTACT_EMAIL}.
          </Text>
        )}

        {cancelError && !isCancelOpen && (
          <p role="alert" className="text-center text-[15px] text-destructive">
            {cancelError}
          </p>
        )}
      </div>

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
      <section className="mx-auto max-w-2xl py-8">{children}</section>
    </Container>
  );
};

export default OrderDetailPage;
