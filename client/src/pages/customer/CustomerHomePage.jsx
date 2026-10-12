import { useEffect } from "react";
import { Link } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Bell, MapPin, ShoppingBag } from "lucide-react";
import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Card from "@/components/common/Card";
import Skeleton from "@/components/common/Skeleton";
import PageHeader from "@/components/common/PageHeader";
import { List, ListIcon, ListRow } from "@/components/common/List";
import OrderStatusBadge from "@/components/order/OrderStatusBadge";
import FoodSearchForm from "@/components/restaurant/FoodSearchForm";
import OpenNowSection from "@/components/home/OpenNowSection";
import { getMyOrdersRequest } from "@/api/orders";
import { FINISHED_STATUSES, ORDER_STATUSES } from "@/data/orderStatuses";
import { onOrderUpdated } from "@/lib/liveUpdates";
import { useAuthStore } from "@/store/authStore";
import { formatDateTime } from "@/utils/date";
import { formatMoney } from "@/utils/money";

const RECENT_SHOWN = 3;

// /customer: my home. Any order in progress comes first, then a search, my recent orders
// (each opens the order, where Reorder is) and kitchens open now.
const CustomerHomePage = () => {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const firstName = user?.fullName ? user.fullName.split(" ")[0] : "";

  // Page 1 of my orders (newest first): enough for "in progress" and "recent"
  const { data, isPending } = useQuery({
    queryKey: ["orders", { page: 1 }],
    queryFn: () => getMyOrdersRequest(1),
  });

  // Live: when one of my orders moves on, fetch again so the status is always current
  useEffect(() => {
    return onOrderUpdated(() => queryClient.invalidateQueries({ queryKey: ["orders"] }));
  }, [queryClient]);

  const orders = data ? data.orders : [];
  const inProgress = orders.filter((order) => !FINISHED_STATUSES.includes(order.status));
  const recent = orders
    .filter((order) => FINISHED_STATUSES.includes(order.status))
    .slice(0, RECENT_SHOWN);

  return (
    <Container>
      <section className="py-8">
        <PageHeader
          title={firstName ? "Hello, " + firstName : "Hello"}
          subtitle="What would you like to eat today?"
        />
        <FoodSearchForm className="mt-4" />

        {isPending && <Skeleton className="mt-8 h-32 w-full max-w-2xl" />}

        {inProgress.length > 0 && (
          <div className="mt-8 max-w-2xl space-y-3">
            <Heading level={2}>
              {inProgress.length === 1 ? "Your order right now" : "Your orders right now"}
            </Heading>
            {inProgress.map((order) => (
              <ActiveOrderCard key={order.id} order={order} />
            ))}
          </div>
        )}

        {recent.length > 0 && (
          <div className="mt-8 max-w-2xl">
            <div className="flex items-end justify-between gap-3">
              <Heading level={2}>Recent orders</Heading>
              <Link
                to="/customer/orders"
                className="inline-flex min-h-11 items-center gap-1 font-bold text-primary"
              >
                All orders <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
            <List className="mt-3">
              {recent.map((order) => (
                <ListRow
                  key={order.id}
                  to={"/customer/orders/" + order.id}
                  leading={<ListIcon icon={ShoppingBag} />}
                  title={order.restaurant.name}
                  badge={<OrderStatusBadge status={order.status} />}
                  meta={formatDateTime(order.createdAt) + " · " + formatMoney(order.totalPesewas)}
                />
              ))}
            </List>
          </div>
        )}

        <div className="mt-10">
          <OpenNowSection bare />
        </div>

        <nav aria-label="Shortcuts" className="mt-10 flex flex-wrap gap-3">
          <Shortcut to="/customer/addresses" icon={MapPin}>
            My addresses
          </Shortcut>
          <Shortcut to="/notifications" icon={Bell}>
            Notifications
          </Shortcut>
        </nav>
      </section>
    </Container>
  );
};

// One order still on its way: the most important thing on this page, so it is highlighted.
// On phones the button sits full width under the text; on wider screens beside it.
const ActiveOrderCard = ({ order }) => {
  const info = ORDER_STATUSES[order.status];

  return (
    <Card tone="highlight" className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-bold">{order.restaurant.name}</p>
          <OrderStatusBadge status={order.status} />
        </div>
        {info && <p className="mt-1 text-[15px]">{info.description}</p>}
        <p className="mt-1 text-[13px] text-muted-foreground">
          {order.orderNumber} · {formatMoney(order.totalPesewas)}
        </p>
      </div>
      <Link
        to={"/customer/orders/" + order.id}
        className="inline-flex min-h-11 items-center justify-center gap-1 rounded-md bg-primary px-4 font-bold text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        {order.status === "PENDING_PAYMENT" ? "Pay now" : "Track order"}
        <ArrowRight size={18} aria-hidden="true" />
      </Link>
    </Card>
  );
};

const Shortcut = ({ to, icon: Icon, children }) => {
  return (
    <Card as={Link} to={to} interactive padding="sm" className="flex items-center gap-2 font-bold">
      <Icon size={18} className="text-primary" aria-hidden="true" />
      {children}
    </Card>
  );
};

export default CustomerHomePage;
