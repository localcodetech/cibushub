import { useSearchParams } from "react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ReceiptText } from "lucide-react";
import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import Card from "@/components/common/Card";
import Skeleton from "@/components/common/Skeleton";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import OrderStatusBadge from "@/components/order/OrderStatusBadge";
import { getOwnerHistoryRequest, getOwnerSummaryRequest } from "@/api/ownerOrders";
import { ORDER_STATUSES } from "@/data/orderStatuses";
import { formatMoney } from "@/utils/money";
import { formatDay, formatTime, todayInGhana } from "@/utils/date";

// Statuses an owner can filter by (unpaid orders never reached the kitchen)
const STATUS_FILTERS = Object.keys(ORDER_STATUSES).filter((status) => status !== "PENDING_PAYMENT");

// Orders that ended without the sale going ahead
const REFUNDED_STATUSES = ["REJECTED", "CANCELLED"];

// /owner/history: one day's orders with that day's totals [AC-RORD-07].
// The day, status and page live in the address (?date=2026-10-10&status=DELIVERED&page=2),
// so a refresh or the back button keeps them.
const OwnerHistoryPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const today = todayInGhana();
  const date = searchParams.get("date") || today;
  const status = searchParams.get("status") || "";
  const page = Number(searchParams.get("page")) || 1;

  // Changes one filter and goes back to page 1; empty values are left out of the address
  const changeFilters = (changes) => {
    const next = { date, status, ...changes };
    const params = {};
    if (next.date !== today) {
      params.date = next.date;
    }
    if (next.status) {
      params.status = next.status;
    }
    if (changes.page && changes.page > 1) {
      params.page = String(changes.page);
    }
    setSearchParams(params);
  };

  const summary = useQuery({
    queryKey: ["owner-summary", date],
    queryFn: () => getOwnerSummaryRequest(date),
  });

  const history = useQuery({
    queryKey: ["owner-history", { date, status, page }],
    queryFn: () => getOwnerHistoryRequest({ date, status, page }),
    placeholderData: keepPreviousData,
  });

  return (
    <Container>
      <section className="mx-auto max-w-2xl py-6">
        <Heading level={1}>History</Heading>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="history-date" className="text-[13px] text-muted-foreground">
              Day
            </label>
            <input
              id="history-date"
              type="date"
              value={date}
              max={today}
              onChange={(event) => changeFilters({ date: event.target.value || today })}
              className="min-h-12 rounded-lg border border-input bg-white px-3.5 text-base dark:bg-card"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="history-status" className="text-[13px] text-muted-foreground">
              Status
            </label>
            <select
              id="history-status"
              value={status}
              onChange={(event) => changeFilters({ status: event.target.value })}
              className="min-h-12 rounded-lg border border-input bg-white px-3.5 text-base dark:bg-card"
            >
              <option value="">All orders</option>
              {STATUS_FILTERS.map((value) => (
                <option key={value} value={value}>
                  {ORDER_STATUSES[value].label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <DaySummary date={date} query={summary} />

        <Heading level={2} className="mt-8">
          Orders
        </Heading>
        <div className="mt-3">
          <HistoryList
            query={history}
            onChangePage={(newPage) => changeFilters({ page: newPage })}
          />
        </div>
      </section>
    </Container>
  );
};

// The day in numbers: how many orders, the food sold and what the restaurant earned.
// Rejected and cancelled orders are counted but bring no money (they were refunded).
const DaySummary = ({ date, query }) => {
  if (query.isPending) {
    return <Skeleton className="mt-6 h-36 w-full" />;
  }
  if (query.error) {
    return (
      <div className="mt-6">
        <ErrorState message={query.error.message} onRetry={query.refetch} />
      </div>
    );
  }

  const summary = query.data;
  const statusCounts = Object.entries(summary.byStatus);

  return (
    <Card className="mt-6">
      <Text size="small" muted>
        {formatDay(date)}
      </Text>
      <dl className="mt-3 grid grid-cols-3 gap-3">
        <div>
          <dt className="text-[13px] text-muted-foreground">Orders</dt>
          <dd className="font-heading text-2xl font-bold">{summary.orderCount}</dd>
        </div>
        <div>
          <dt className="text-[13px] text-muted-foreground">Food sold</dt>
          <dd className="font-heading text-lg font-bold">{formatMoney(summary.salesPesewas)}</dd>
        </div>
        <div>
          <dt className="text-[13px] text-muted-foreground">Your earnings</dt>
          <dd className="font-heading text-lg font-bold text-primary">
            {formatMoney(summary.earningsPesewas)}
          </dd>
        </div>
      </dl>
      {statusCounts.length > 0 && (
        <p className="mt-3 border-t border-border pt-3 text-[15px] text-muted-foreground">
          {statusCounts
            .map(([status, count]) => count + " " + ORDER_STATUSES[status].label.toLowerCase())
            .join(" · ")}
        </p>
      )}
    </Card>
  );
};

// Loading, error, empty or the day's orders, with page buttons [AC-UX-02 to 04]
const HistoryList = ({ query, onChangePage }) => {
  if (query.isPending) {
    return (
      <div role="status" className="space-y-3">
        <span className="sr-only">Loading orders</span>
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }
  if (query.error) {
    return <ErrorState message={query.error.message} onRetry={query.refetch} />;
  }

  const { orders, meta } = query.data;
  if (orders.length === 0) {
    return (
      <EmptyState
        icon={ReceiptText}
        title="No orders"
        message="No orders match this day and status."
      />
    );
  }

  // Owners with several restaurants see which one each order was for
  const showRestaurant = new Set(orders.map((order) => order.restaurant.id)).size > 1;

  return (
    <>
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {orders.map((order) => (
          <li key={order.id} className="px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold">{order.orderNumber}</p>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {formatTime(order.placedAt)}
              {showRestaurant && " · " + order.restaurant.name}
            </p>
            <p className="mt-0.5 flex justify-between text-[15px]">
              <span>Food {formatMoney(order.subtotalPesewas)}</span>
              {/* Refunded orders earn nothing, so don't show earnings for them */}
              {REFUNDED_STATUSES.includes(order.status) ? (
                <span className="text-muted-foreground">Refunded</span>
              ) : (
                <span className="font-bold">
                  You earn {formatMoney(order.restaurantEarningsPesewas)}
                </span>
              )}
            </p>
          </li>
        ))}
      </ul>

      {meta.totalPages > 1 && (
        <nav aria-label="Pages" className="mt-6 flex items-center justify-between gap-4">
          <button
            type="button"
            disabled={meta.page <= 1}
            onClick={() => onChangePage(meta.page - 1)}
            className="min-h-11 rounded-md border border-border px-4 font-bold disabled:opacity-40"
          >
            Previous
          </button>
          <Text size="small" muted>
            Page {meta.page} of {meta.totalPages}
          </Text>
          <button
            type="button"
            disabled={meta.page >= meta.totalPages}
            onClick={() => onChangePage(meta.page + 1)}
            className="min-h-11 rounded-md border border-border px-4 font-bold disabled:opacity-40"
          >
            Next
          </button>
        </nav>
      )}
    </>
  );
};

export default OwnerHistoryPage;
