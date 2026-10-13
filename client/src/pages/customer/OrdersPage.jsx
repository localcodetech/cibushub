import { useEffect } from "react";
import { useSearchParams } from "react-router";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { ReceiptText, ShoppingBag } from "lucide-react";
import Container from "@/layouts/Container";
import Text from "@/components/typography/Text";
import Skeleton from "@/components/common/Skeleton";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import OrderStatusBadge from "@/components/order/OrderStatusBadge";
import { getMyOrdersRequest } from "@/api/orders";
import { formatMoney } from "@/utils/money";
import { formatDateTime } from "@/utils/date";
import { onOrderUpdated } from "@/lib/liveUpdates";
import { List, ListIcon, ListRow } from "@/components/common/List";
import PageHeader from "@/components/common/PageHeader";

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
        <PageHeader title="My orders" />
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
      <List>
        {data.orders.map((order) => (
          <ListRow
            key={order.id}
            to={"/customer/orders/" + order.id}
            leading={<ListIcon icon={ShoppingBag} />}
            title={order.restaurant.name}
            badge={<OrderStatusBadge status={order.status} />}
            meta={order.orderNumber + " · " + formatDateTime(order.createdAt)}
            detail={<span className="font-bold">{formatMoney(order.totalPesewas)}</span>}
          />
        ))}
      </List>

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
