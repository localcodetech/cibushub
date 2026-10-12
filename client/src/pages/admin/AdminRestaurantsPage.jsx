import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Search, Store } from "lucide-react";
import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import Skeleton from "@/components/common/Skeleton";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import StatusBadge from "@/components/common/StatusBadge";
import { getAdminRestaurantsRequest } from "@/api/admin";
import { RESTAURANT_STATUSES } from "@/data/restaurantStatuses";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { formatDateTime } from "@/utils/date";
import { cn } from "@/lib/utils";
import { List, ListIcon, ListRow } from "@/components/common/List";

// The tabs, the review queue first. status "" means every restaurant.
const TABS = [
  { status: "PENDING_APPROVAL", label: "Waiting for review" },
  { status: "APPROVED", label: "Live" },
  { status: "SUSPENDED", label: "Suspended" },
  { status: "REJECTED", label: "Rejected" },
  { status: "", label: "All" },
];

// /admin/restaurants: review new restaurants and manage live ones [AC-ADM-03]
const AdminRestaurantsPage = () => {
  const [status, setStatus] = useState("PENDING_APPROVAL");
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);

  // Wait until typing stops for a moment before searching [AC-DISC-06]
  const search = useDebouncedValue(searchText.trim(), 300);

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["admin-restaurants", { status, search, page }],
    queryFn: () => getAdminRestaurantsRequest({ status, q: search, page }),
    placeholderData: keepPreviousData,
  });

  const handleTab = (newStatus) => {
    setStatus(newStatus);
    setPage(1);
  };

  const handleSearch = (event) => {
    setSearchText(event.target.value);
    setPage(1);
  };

  return (
    <Container>
      <section className="py-8">
        <Heading level={1}>Restaurants</Heading>

        <div role="group" aria-label="Show" className="mt-6 flex gap-2 overflow-x-auto pb-1">
          {TABS.map((tab) => (
            <button
              key={tab.label}
              type="button"
              onClick={() => handleTab(tab.status)}
              aria-pressed={status === tab.status}
              className={cn(
                "min-h-11 shrink-0 rounded-full border px-4 font-bold",
                status === tab.status
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <label className="relative mt-4 block max-w-md">
          <span className="sr-only">Search by name</span>
          <Search
            size={18}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchText}
            onChange={handleSearch}
            placeholder="Search by name"
            className="h-12 w-full rounded-md border border-input bg-background pr-3 pl-10 text-base"
          />
        </label>

        <div className="mt-6">
          <RestaurantList
            data={data}
            isPending={isPending}
            error={error}
            onRetry={refetch}
            isQueue={status === "PENDING_APPROVAL" && !search}
          />
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
              Page {data.meta.page} of {data.meta.totalPages}
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
const RestaurantList = ({ data, isPending, error, onRetry, isQueue }) => {
  if (isPending) {
    return (
      <div role="status" className="space-y-3">
        <span className="sr-only">Loading restaurants</span>
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error.message} onRetry={onRetry} />;
  }

  if (data.restaurants.length === 0) {
    return (
      <EmptyState
        icon={Store}
        title={isQueue ? "Nothing to review" : "No restaurants found"}
        message={isQueue ? "New restaurants show here when their owners submit them." : null}
      />
    );
  }

  return (
    <List>
      {data.restaurants.map((restaurant) => {
        const statusInfo = RESTAURANT_STATUSES[restaurant.status];
        return (
          <ListRow
            key={restaurant.id}
            to={"/admin/restaurants/" + restaurant.id}
            leading={<ListIcon icon={Store} />}
            title={restaurant.name}
            badge={<StatusBadge label={statusInfo.label} tone={statusInfo.tone} />}
            meta={
              restaurant.area +
              " · " +
              (restaurant.owner ? restaurant.owner.fullName : "No owner") +
              " · since " +
              formatDateTime(restaurant.createdAt)
            }
          />
        );
      })}
    </List>
  );
};

export default AdminRestaurantsPage;
