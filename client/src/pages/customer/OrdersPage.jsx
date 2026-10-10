import { useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, ReceiptText } from "lucide-react";
import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import Skeleton from "@/components/common/Skeleton";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import OrderStatusBadge from "@/components/order/OrderStatusBadge";
import { getMyOrdersRequest } from "@/api/orders";
import { formatMoney } from "@/utils/money";
import { formatDateTime } from "@/utils/date";
import { onOrderUpdated } from "@/lib/liveUpdates";

// /customer/orders: my orders, newest first, 20 a page [AC-CUST-09]
const OrdersPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get("page")) || 1;
  const queryClient = useQueryClient();

  // Live: when any of my orders changes, the badges here update by themselves [AC-RT-03]
  useEffect(() => {
    return onOrderUpdated(() => queryClient.invalidateQueries({ queryKey: ["orders"] }));
  }, [queryClient]);

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["orders", { page }],
    queryFn: () => getMyOrdersRequest(page),
    placeholderData: keepPreviousData,
  });

  const handleChangePage = (newPage) => {
    setSearchParams({ page: String(newPage) });
    window.scrollTo(0, 0);
  };

  return (
    <Container>
      <section className="mx-auto max-w-2xl py-8">
        <Heading level={1}>My orders</Heading>
        <div className="mt-6">
          <OrderList
            data={data}
            isPending={isPending}
            error={error}
            onRetry={refetch}
            onChangePage={handleChangePage}
          />
        </div>
      </section>
    </Container>
  );
};

// Loading, error, empty or the list [AC-UX-02 to 04]
const OrderList = ({ data, isPending, error, onRetry, onChangePage }) => {
  if (isPending) {
    return (
      <div role="status" className="space-y-3">
        <span className="sr-only">Loading orders</span>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error.message} onRetry={onRetry} />;
  }

  if (data.orders.length === 0) {
    return (
      <EmptyState
        icon={ReceiptText}
        title="No orders yet"
        message="When you order, it will show here so you can follow it."
        action={{ label: "Find food", to: "/restaurants" }}
      />
    );
  }

  return (
    <>
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {data.orders.map((order) => (
          <li key={order.id}>
            {/* The whole row opens the order */}
            <Link to={"/customer/orders/" + order.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="truncate font-bold">{order.restaurant.name}</p>
                  <OrderStatusBadge status={order.status} />
                </div>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {order.orderNumber} · {formatDateTime(order.createdAt)}
                </p>
                <p className="mt-0.5 text-[15px] font-bold">{formatMoney(order.totalPesewas)}</p>
              </div>
              <ChevronRight
                size={18}
                className="shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>

      {data.meta.totalPages > 1 && (
        <nav aria-label="Pages" className="mt-6 flex items-center justify-between gap-4">
          <button
            type="button"
            disabled={data.meta.page <= 1}
            onClick={() => onChangePage(data.meta.page - 1)}
            className="min-h-11 rounded-md border border-border px-4 font-bold disabled:opacity-40"
          >
            Previous
          </button>
          <Text size="small" muted>
            Page {data.meta.page} of {data.meta.totalPages}
          </Text>
          <button
            type="button"
            disabled={data.meta.page >= data.meta.totalPages}
            onClick={() => onChangePage(data.meta.page + 1)}
            className="min-h-11 rounded-md border border-border px-4 font-bold disabled:opacity-40"
          >
            Next
          </button>
        </nav>
      )}
    </>
  );
};

export default OrdersPage;
