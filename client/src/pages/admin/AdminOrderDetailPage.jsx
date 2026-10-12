import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, MapPin, Phone } from "lucide-react";
import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import Card from "@/components/common/Card";
import Skeleton from "@/components/common/Skeleton";
import ErrorState from "@/components/common/ErrorState";
import { Button } from "@/components/ui/button";
import OrderStatusBadge from "@/components/order/OrderStatusBadge";
import ConfirmActionSheet from "@/components/admin/ConfirmActionSheet";
import AdminCancelOrderSheet from "@/components/admin/AdminCancelOrderSheet";
import AssignRiderSheet from "@/components/admin/AssignRiderSheet";
import RouteMap from "@/components/map/RouteMap";
import {
  adminUnassignRiderRequest,
  adminUnlockCodeRequest,
  getAdminOrderRequest,
} from "@/api/admin";
import { ORDER_STATUSES } from "@/data/orderStatuses";
import { VEHICLE_NAMES } from "@/data/riderStatuses";
import { onOrderUpdated } from "@/lib/liveUpdates";
import { formatMoney } from "@/utils/money";
import { formatDateTime } from "@/utils/date";

// Who did a step, in words
const ACTOR_WORDS = {
  CUSTOMER: "Customer",
  RESTAURANT_OWNER: "Restaurant",
  RIDER: "Rider",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super admin",
  SYSTEM: "System",
};

// /admin/orders/:orderId: everything about one order, and the admin's actions [AC-ADM-05]
const AdminOrderDetailPage = () => {
  const { orderId } = useParams();
  const queryClient = useQueryClient();
  // Which sheet is open: "cancel", "assign", "unassign", "unlock" or null
  const [openAction, setOpenAction] = useState(null);

  const {
    data: order,
    isPending,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin-order", orderId],
    queryFn: () => getAdminOrderRequest(orderId),
  });

  // Live: when this order changes, fetch it again [AC-RT-03]
  useEffect(() => {
    return onOrderUpdated((event) => {
      if (event.orderId === orderId) {
        queryClient.invalidateQueries({ queryKey: ["admin-order", orderId] });
      }
    });
  }, [queryClient, orderId]);

  if (isPending) {
    return (
      <Container>
        <div role="status" className="space-y-4 py-8">
          <span className="sr-only">Loading order</span>
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <div className="py-8">
          <ErrorState message={error.message} onRetry={refetch} />
        </div>
      </Container>
    );
  }

  // After an action: this order, the lists and the dashboard
  const refreshAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin-order", orderId] });
    queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["admin-live-riders"] });
  };

  const actions = order.adminActions;
  const delivery = order.delivery;

  return (
    <Container>
      <section className="mx-auto max-w-3xl py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/admin/orders" className="text-[15px] font-bold text-primary">
            ← Orders
          </Link>
          <Link
            to={"/admin/audit-log?targetId=" + order.id}
            className="text-[15px] font-bold text-primary"
          >
            History
          </Link>
        </div>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <Heading level={1}>{order.orderNumber}</Heading>
            <Text size="small" muted className="mt-1">
              Placed {formatDateTime(order.createdAt)}
            </Text>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>

        {/* Only the actions that apply now */}
        <div className="mt-6 flex flex-wrap gap-3">
          {actions.canChangeRider && (
            <Button onClick={() => setOpenAction("assign")} className="h-12 font-bold">
              {delivery && delivery.rider ? "Change rider" : "Assign a rider"}
            </Button>
          )}
          {actions.canUnassignRider && (
            <Button
              variant="outline"
              onClick={() => setOpenAction("unassign")}
              className="h-12 font-bold"
            >
              Take rider off
            </Button>
          )}
          {actions.canUnlockCode && (
            <Button onClick={() => setOpenAction("unlock")} className="h-12 font-bold">
              Unlock delivery code
            </Button>
          )}
          {actions.canCancel && (
            <Button
              variant="outline"
              onClick={() => setOpenAction("cancel")}
              className="h-12 font-bold text-destructive"
            >
              Cancel order
            </Button>
          )}
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Card className="space-y-2 text-[15px]">
            <p className="font-bold">Customer</p>
            <p>{order.customer ? order.customer.fullName : "—"}</p>
            <p className="flex items-start gap-2">
              <Phone size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
              <a href={"tel:" + order.contactPhone} className="underline">
                {order.contactPhone}
              </a>
            </p>
            {order.customer && order.customer.email && (
              <p className="flex items-start gap-2 break-all">
                <Mail size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                {order.customer.email}
              </p>
            )}
            <p className="flex items-start gap-2">
              <MapPin size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
              {[order.deliveryLandmark, order.deliveryArea].filter(Boolean).join(", ") ||
                "Pin on the map"}
            </p>
          </Card>

          <Card className="space-y-2 text-[15px]">
            <p className="font-bold">Restaurant</p>
            <Link to={"/admin/restaurants/" + order.restaurant.id} className="underline">
              {order.restaurant.name}
            </Link>
            <p className="flex items-start gap-2">
              <Phone size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
              <a href={"tel:" + order.restaurant.phone} className="underline">
                {order.restaurant.phone}
              </a>
            </p>
            <p className="text-muted-foreground">
              {order.restaurant.addressLine}, {order.restaurant.area}
            </p>
          </Card>
        </div>

        <Timeline timeline={order.timeline} />
        <Money order={order} />
        <Delivery delivery={delivery} />

        <section className="mt-8">
          <Heading level={2}>Rider's route</Heading>
          {order.path.length === 0 ? (
            <Text muted className="mt-2">
              No rider route saved for this order.
            </Text>
          ) : (
            <div className="mt-3">
              <RouteMap
                restaurant={order.restaurant}
                dropoff={{ latitude: order.deliveryLatitude, longitude: order.deliveryLongitude }}
                path={order.path}
              />
              <Text size="small" muted className="mt-2">
                {order.path.length} points, {formatDateTime(order.path[0].at)} to{" "}
                {formatDateTime(order.path[order.path.length - 1].at)}
              </Text>
            </div>
          )}
        </section>
      </section>

      {openAction === "cancel" && (
        <AdminCancelOrderSheet
          order={order}
          onDone={refreshAll}
          onClose={() => setOpenAction(null)}
        />
      )}
      {openAction === "assign" && (
        <AssignRiderSheet
          order={order}
          currentRiderId={delivery && delivery.rider ? delivery.rider.id : null}
          onDone={refreshAll}
          onClose={() => setOpenAction(null)}
        />
      )}
      {openAction === "unassign" && (
        <ConfirmActionSheet
          title={"Take " + delivery.rider.fullName + " off this order?"}
          description="The order goes back to the search for a rider."
          confirmLabel="Take off"
          needsReason
          reasonMinLength={5}
          isDangerous
          onConfirm={async (reason) => {
            await adminUnassignRiderRequest(order.id, reason);
            await refreshAll();
          }}
          onClose={() => setOpenAction(null)}
        />
      )}
      {openAction === "unlock" && (
        <ConfirmActionSheet
          title="Unlock the delivery code?"
          description="Only after checking with the customer that the rider is really at their door."
          confirmLabel="Unlock"
          needsReason
          reasonMinLength={5}
          onConfirm={async (reason) => {
            await adminUnlockCodeRequest(order.id, reason);
            await refreshAll();
          }}
          onClose={() => setOpenAction(null)}
        />
      )}
    </Container>
  );
};

// Every step, who did it and why
const Timeline = ({ timeline }) => {
  return (
    <section className="mt-8">
      <Heading level={2}>Timeline</Heading>
      <ol className="mt-3 divide-y divide-border rounded-lg border border-border bg-card">
        {timeline.map((entry) => (
          <li key={entry.status + entry.at} className="px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold">
                {ORDER_STATUSES[entry.status] ? ORDER_STATUSES[entry.status].label : entry.status}
              </span>
              <span className="text-[13px] text-muted-foreground">{formatDateTime(entry.at)}</span>
            </div>
            <p className="text-[13px] text-muted-foreground">
              By {ACTOR_WORDS[entry.by] || entry.by}
              {entry.byName ? " (" + entry.byName + ")" : ""}
            </p>
            {entry.reason && <p className="mt-1 text-[15px]">{entry.reason}</p>}
          </li>
        ))}
      </ol>
    </section>
  );
};

// Items, totals, how the money is split, payments and refunds
const Money = ({ order }) => {
  return (
    <section className="mt-8">
      <Heading level={2}>Items and money</Heading>
      <Card className="mt-3 space-y-1 text-[15px]">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between gap-3">
            <span>
              {item.quantity} × {item.name}
            </span>
            <span>{formatMoney(item.lineTotalPesewas)}</span>
          </div>
        ))}
        <div className="my-2 border-t border-border" />
        <Row label="Delivery fee" pesewas={order.deliveryFeePesewas} />
        {order.discountPesewas > 0 && <Row label="Discount" pesewas={-order.discountPesewas} />}
        <Row label="Total" pesewas={order.totalPesewas} bold />
        <div className="my-2 border-t border-border" />
        <Row
          label={"CibusHub commission (" + order.commissionPercent + "%)"}
          pesewas={order.commissionPesewas}
        />
        <Row label="Restaurant gets" pesewas={order.restaurantEarningsPesewas} />
        <Row label="Rider gets" pesewas={order.riderEarningsPesewas} />
      </Card>

      <Heading level={3} className="mt-6">
        Payments
      </Heading>
      {order.payments.length === 0 ? (
        <Text muted className="mt-2">
          No payment attempts.
        </Text>
      ) : (
        <ul className="mt-2 divide-y divide-border rounded-lg border border-border bg-card">
          {order.payments.map((payment) => (
            <li key={payment.id} className="px-4 py-3 text-[15px]">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="font-bold">{payment.status}</span>
                <span>{formatMoney(payment.amountPesewas)}</span>
              </div>
              <p className="text-[13px] break-all text-muted-foreground">
                {payment.reference} · {payment.channel || "—"} · {formatDateTime(payment.createdAt)}
              </p>
              {payment.gatewayResponse && (
                <p className="text-[13px] text-muted-foreground">
                  Paystack: {payment.gatewayResponse}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {order.refunds.length > 0 && (
        <>
          <Heading level={3} className="mt-6">
            Refunds
          </Heading>
          <ul className="mt-2 divide-y divide-border rounded-lg border border-border bg-card">
            {order.refunds.map((refund) => (
              <li key={refund.id} className="px-4 py-3 text-[15px]">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-bold">{refund.status}</span>
                  <span>{formatMoney(refund.amountPesewas)}</span>
                </div>
                <p className="text-[13px] text-muted-foreground">{refund.reason}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
};

const Row = ({ label, pesewas, bold = false }) => {
  return (
    <div className={"flex justify-between gap-3" + (bold ? " font-bold" : "")}>
      <span>{label}</span>
      <span>{formatMoney(pesewas)}</span>
    </div>
  );
};

// The delivery and its rider
const Delivery = ({ delivery }) => {
  return (
    <section className="mt-8">
      <Heading level={2}>Delivery</Heading>
      {!delivery ? (
        <Text muted className="mt-2">
          No delivery yet (it starts when the restaurant accepts).
        </Text>
      ) : (
        <Card className="mt-3 space-y-1 text-[15px]">
          <p>
            <span className="font-bold">{delivery.status}</span> · {delivery.ridersAsked} riders
            asked
          </p>
          {delivery.rider ? (
            <p>
              {delivery.rider.fullName} ·{" "}
              <a href={"tel:" + delivery.rider.phone} className="underline">
                {delivery.rider.phone}
              </a>{" "}
              · {VEHICLE_NAMES[delivery.rider.vehicleType]}
              {delivery.rider.plateNumber ? " " + delivery.rider.plateNumber : ""}
            </p>
          ) : (
            <p className="text-muted-foreground">No rider yet</p>
          )}
          {delivery.codeLocked && (
            <p className="font-bold text-destructive">
              Delivery code locked after {delivery.codeAttempts} wrong tries
            </p>
          )}
          {delivery.problemType && <p>Problem at the door: {delivery.problemType}</p>}
          {delivery.failureReason && <p>Failed: {delivery.failureReason}</p>}
        </Card>
      )}
    </section>
  );
};

export default AdminOrderDetailPage;
