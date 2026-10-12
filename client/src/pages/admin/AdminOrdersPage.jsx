import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ReceiptText, Search } from "lucide-react";
import Container from "@/layouts/Container";
import Text from "@/components/typography/Text";
import Skeleton from "@/components/common/Skeleton";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import OrderStatusBadge from "@/components/order/OrderStatusBadge";
import { getAdminOrdersRequest } from "@/api/admin";
import { ORDER_STATUSES } from "@/data/orderStatuses";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { formatMoney } from "@/utils/money";
import { formatDateTime } from "@/utils/date";
import { List, ListIcon, ListRow } from "@/components/common/List";
import PageHeader from "@/components/common/PageHeader";

// /admin/orders: find any order [AC-ADM-05]
const AdminOrdersPage = () => {
  const [searchText, setSearchText] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  // Wait until typing stops before searching; the server needs at least 2 letters
  const typed = useDebouncedValue(searchText.trim(), 300);
  const q = typed.length >= 2 ? typed : "";

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["admin-orders", { q, status, from, to, page }],
    queryFn: () => getAdminOrdersRequest({ q, status, from, to, page }),
    placeholderData: keepPreviousData,
  });

  // Any filter change starts again at page 1
  const changeFilter = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };

  return (
    <Container>
      <section className="py-8">
        <PageHeader title="Orders" />

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="relative block sm:col-span-2">
            <span className="sr-only">Order number, phone or restaurant</span>
            <Search
              size={18}
              className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchText}
              onChange={changeFilter(setSearchText)}
              placeholder="Order number, phone or restaurant"
              className="h-12 w-full rounded-md border border-input bg-background pr-3 pl-10 text-base"
            />
          </label>
          <label className="block sm:col-span-2 lg:col-span-1">
            <span className="sr-only">Status</span>
            <select
              value={status}
              onChange={changeFilter(setStatus)}
              className="h-12 w-full rounded-md border border-input bg-background px-3 text-base"
            >
              <option value="">Every status</option>
              {Object.entries(ORDER_STATUSES).map(([value, info]) => (
                <option key={value} value={value}>
                  {info.label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2 sm:col-span-2 lg:col-span-1">
            <label className="block">
              <span className="text-[13px] text-muted-foreground">From</span>
              <input
                type="date"
                value={from}
                onChange={changeFilter(setFrom)}
                className="h-12 w-full rounded-md border border-input bg-background px-2 text-base"
              />
            </label>
            <label className="block">
              <span className="text-[13px] text-muted-foreground">To</span>
              <input
                type="date"
                value={to}
                onChange={changeFilter(setTo)}
                className="h-12 w-full rounded-md border border-input bg-background px-2 text-base"
              />
            </label>
          </div>
        </div>

        <div className="mt-6">
          <OrderList data={data} isPending={isPending} error={error} onRetry={refetch} />
        </div>

        {data && data.meta.totalPages > 1 && (
          <nav aria-label="Pages" className="mt-6 flex items-center justify-between gap-4">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="min-h-11 rounded-md border border-border px-4 font-bold disabled:opacity-40"
            >
              Previous
            </button>
            <Text size="small" muted>
              Page {data.meta.page} of {data.meta.totalPages} · {data.meta.totalItems} orders
            </Text>
            <button
              type="button"
              disabled={page >= data.meta.totalPages}
              onClick={() => setPage(page + 1)}
              className="min-h-11 rounded-md border border-border px-4 font-bold disabled:opacity-40"
            >
              Next
            </button>
          </nav>
        )}
      </section>
    </Container>
  );
};

// Loading, error, empty or the list [AC-UX-02 to 04]
const OrderList = ({ data, isPending, error, onRetry }) => {
  if (isPending) {
    return (
      <div role="status" className="space-y-3">
        <span className="sr-only">Loading orders</span>
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error.message} onRetry={onRetry} />;
  }

  if (data.orders.length === 0) {
    return <EmptyState icon={ReceiptText} title="No orders found" />;
  }

  return (
    <List>
      {data.orders.map((order) => (
        <ListRow
          key={order.id}
          to={"/admin/orders/" + order.id}
          leading={<ListIcon icon={ReceiptText} />}
          title={order.orderNumber}
          badge={<OrderStatusBadge status={order.status} />}
          meta={
            (order.restaurant ? order.restaurant.name : "—") +
            " · " +
            (order.customer ? order.customer.fullName : "—") +
            " · " +
            formatDateTime(order.createdAt)
          }
          detail={<span className="font-bold">{formatMoney(order.totalPesewas)}</span>}
        />
      ))}
    </List>
  );
};

export default AdminOrdersPage;
