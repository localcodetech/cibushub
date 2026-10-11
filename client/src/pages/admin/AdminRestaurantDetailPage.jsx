import { useState } from "react";
import { Link, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, FileText, Mail, MapPin, Phone } from "lucide-react";
import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import Card from "@/components/common/Card";
import Skeleton from "@/components/common/Skeleton";
import ErrorState from "@/components/common/ErrorState";
import { Button } from "@/components/ui/button";
import StatusPill from "@/components/admin/StatusPill";
import ConfirmActionSheet from "@/components/admin/ConfirmActionSheet";
import OrderStatusBadge from "@/components/order/OrderStatusBadge";
import RatingBadge from "@/components/review/RatingBadge";
import {
  approveRestaurantRequest,
  getAdminRestaurantDocumentsRequest,
  getAdminRestaurantRequest,
  rejectRestaurantRequest,
  suspendRestaurantRequest,
} from "@/api/admin";
import { DOCUMENT_NAMES, RESTAURANT_STATUSES } from "@/data/restaurantStatuses";
import { formatMoney } from "@/utils/money";
import { formatDateTime } from "@/utils/date";

// /admin/restaurants/:restaurantId: check one restaurant, then approve, reject, suspend
// or reactivate it [AC-ADM-03]. Every action asks first; reject and suspend need a reason [AC-ADM-08].
const AdminRestaurantDetailPage = () => {
  const { restaurantId } = useParams();
  const queryClient = useQueryClient();
  // Which action's "Are you sure?" sheet is open: "approve", "reject", "suspend" or null
  const [openAction, setOpenAction] = useState(null);

  const {
    data: restaurant,
    isPending,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin-restaurant", restaurantId],
    queryFn: () => getAdminRestaurantRequest(restaurantId),
  });

  if (isPending) {
    return (
      <Container>
        <div role="status" className="space-y-4 py-8">
          <span className="sr-only">Loading restaurant</span>
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
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

  // After an action: fetch this restaurant, the lists and the dashboard counts again
  const refreshAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin-restaurant", restaurantId] });
    queryClient.invalidateQueries({ queryKey: ["admin-restaurants"] });
    queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
  };

  const statusInfo = RESTAURANT_STATUSES[restaurant.status];

  return (
    <Container>
      <section className="mx-auto max-w-3xl py-8">
        <Link to="/admin/restaurants" className="text-[15px] font-bold text-primary">
          ← Restaurants
        </Link>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <Heading level={1}>{restaurant.name}</Heading>
            <Text size="small" muted className="mt-1">
              Legal name: {restaurant.legalName || "not given"}
            </Text>
          </div>
          <StatusPill label={statusInfo.label} tone={statusInfo.tone} />
        </div>

        {restaurant.rejectionReason && (
          <Card className="mt-4 border-destructive">
            <p className="font-bold text-destructive">Last reason given</p>
            <p className="mt-1">{restaurant.rejectionReason}</p>
          </Card>
        )}

        <Actions status={restaurant.status} onChoose={setOpenAction} />

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Card className="space-y-2 text-[15px]">
            <p className="font-bold">Restaurant</p>
            <p className="flex items-start gap-2">
              <MapPin size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
              {restaurant.addressLine}, {restaurant.area}, {restaurant.city}
            </p>
            <p className="flex items-start gap-2">
              <Phone size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
              <a href={"tel:" + restaurant.phone} className="underline">
                {restaurant.phone}
              </a>
            </p>
            <p className="text-muted-foreground capitalize">{restaurant.cuisineTags.join(" · ")}</p>
          </Card>

          <Card className="space-y-2 text-[15px]">
            <p className="font-bold">Owner</p>
            {restaurant.owner ? (
              <>
                <p>{restaurant.owner.fullName}</p>
                <p className="flex items-start gap-2">
                  <Phone size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                  <a href={"tel:" + restaurant.owner.phone} className="underline">
                    {restaurant.owner.phone}
                  </a>
                </p>
                <p className="flex items-start gap-2 break-all">
                  <Mail size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                  <a href={"mailto:" + restaurant.owner.email} className="underline">
                    {restaurant.owner.email}
                  </a>
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">No owner found</p>
            )}
          </Card>
        </div>

        <Documents restaurantId={restaurant.id} />
        <Performance performance={restaurant.performance} />
      </section>

      {openAction === "approve" && (
        <ConfirmActionSheet
          title={
            restaurant.status === "SUSPENDED"
              ? `Reactivate ${restaurant.name}?`
              : `Approve ${restaurant.name}?`
          }
          description="It goes live for customers, and the owner gets an SMS and an email."
          confirmLabel={restaurant.status === "SUSPENDED" ? "Reactivate" : "Approve"}
          onConfirm={async () => {
            await approveRestaurantRequest(restaurant.id);
            await refreshAll();
          }}
          onClose={() => setOpenAction(null)}
        />
      )}
      {openAction === "reject" && (
        <ConfirmActionSheet
          title={`Reject ${restaurant.name}?`}
          description="The owner sees your reason, can fix the details and submit again."
          confirmLabel="Reject"
          needsReason
          isDangerous
          onConfirm={async (reason) => {
            await rejectRestaurantRequest(restaurant.id, reason);
            await refreshAll();
          }}
          onClose={() => setOpenAction(null)}
        />
      )}
      {openAction === "suspend" && (
        <ConfirmActionSheet
          title={`Suspend ${restaurant.name}?`}
          description="It disappears from the app until you reactivate it. The owner is told why."
          confirmLabel="Suspend"
          needsReason
          isDangerous
          onConfirm={async (reason) => {
            await suspendRestaurantRequest(restaurant.id, reason);
            await refreshAll();
          }}
          onClose={() => setOpenAction(null)}
        />
      )}
    </Container>
  );
};

// The buttons that make sense for the current status
const Actions = ({ status, onChoose }) => {
  if (status === "PENDING_APPROVAL") {
    return (
      <div className="mt-6 flex gap-3">
        <Button onClick={() => onChoose("approve")} className="h-12 flex-1 font-bold sm:flex-none">
          Approve
        </Button>
        <Button
          variant="outline"
          onClick={() => onChoose("reject")}
          className="h-12 flex-1 font-bold text-destructive sm:flex-none"
        >
          Reject
        </Button>
      </div>
    );
  }
  if (status === "APPROVED") {
    return (
      <div className="mt-6">
        <Button
          variant="outline"
          onClick={() => onChoose("suspend")}
          className="h-12 font-bold text-destructive"
        >
          Suspend
        </Button>
      </div>
    );
  }
  if (status === "SUSPENDED") {
    return (
      <div className="mt-6">
        <Button onClick={() => onChoose("approve")} className="h-12 font-bold">
          Reactivate
        </Button>
      </div>
    );
  }
  return null;
};

// The verification documents. Their links work for 5 minutes, so they are fetched on their
// own and refreshed when the admin comes back to the page.
const Documents = ({ restaurantId }) => {
  const { data, isPending, error } = useQuery({
    queryKey: ["admin-restaurant-documents", restaurantId],
    queryFn: () => getAdminRestaurantDocumentsRequest(restaurantId),
    staleTime: 60 * 1000,
  });

  return (
    <section className="mt-8">
      <Heading level={2}>Documents</Heading>
      {isPending && <Skeleton className="mt-3 h-20 w-full" />}
      {error && (
        <Text muted className="mt-3">
          Documents couldn't load: {error.message}
        </Text>
      )}
      {data && data.length === 0 && (
        <Text muted className="mt-3">
          No documents uploaded.
        </Text>
      )}
      {data && data.length > 0 && (
        <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-card">
          {data.map((document) => (
            <li key={document.documentType}>
              <a
                href={document.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 px-4 py-3"
              >
                <FileText size={18} className="shrink-0 text-primary" aria-hidden="true" />
                <span className="flex-1 font-bold">
                  {DOCUMENT_NAMES[document.documentType] || document.documentType}
                </span>
                <span className="text-[13px] text-muted-foreground uppercase">
                  {document.format}
                </span>
                <ExternalLink size={16} className="text-muted-foreground" aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

// How it has been doing over the last 30 days
const Performance = ({ performance }) => {
  const rejected = performance.ordersByStatus.REJECTED || 0;
  const delivered = performance.ordersByStatus.DELIVERED || 0;
  let rejectedShare = "—";
  if (performance.totalOrders > 0) {
    rejectedShare = Math.round((rejected / performance.totalOrders) * 100) + "%";
  }

  return (
    <section className="mt-8">
      <Heading level={2}>Last {performance.days} days</Heading>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <MiniStat label="Orders" value={performance.totalOrders} />
        <MiniStat label="Delivered" value={delivered} />
        <MiniStat label="Rejected" value={rejectedShare} />
        <MiniStat label="Delivered value" value={formatMoney(performance.deliveredPesewas)} />
      </div>
      <p className="mt-3 text-[15px] text-muted-foreground">
        Rating:{" "}
        <RatingBadge
          averageRating={performance.averageRating}
          reviewCount={performance.reviewCount}
        />
      </p>

      <Heading level={3} className="mt-6">
        Latest orders
      </Heading>
      {performance.recentOrders.length === 0 ? (
        <Text muted className="mt-2">
          No orders yet.
        </Text>
      ) : (
        <ul className="mt-2 divide-y divide-border rounded-lg border border-border bg-card">
          {performance.recentOrders.map((order) => (
            <li
              key={order.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
            >
              <div>
                <p className="font-bold">{order.orderNumber}</p>
                <p className="text-[13px] text-muted-foreground">
                  {formatDateTime(order.createdAt)} · {formatMoney(order.totalPesewas)}
                </p>
              </div>
              <OrderStatusBadge status={order.status} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

const MiniStat = ({ label, value }) => {
  return (
    <Card>
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <p className="mt-1 font-heading text-xl font-bold">{value}</p>
    </Card>
  );
};

export default AdminRestaurantDetailPage;
