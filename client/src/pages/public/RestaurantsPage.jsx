import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { SearchX, Store } from "lucide-react";
import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import Skeleton from "@/components/common/Skeleton";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import RestaurantCard from "@/components/restaurant/RestaurantCard";
import RestaurantFilters from "@/components/restaurant/RestaurantFilters";
import { getRestaurantsRequest } from "@/api/restaurants";

// How long to wait after the last key press before searching [AC-DISC-06]
const SEARCH_DELAY_MS = 300;

// /restaurants: every approved restaurant, for guests and customers [AC-DISC-01].
// Search, filters, sort and page all live in the URL (?q=jollof&openNow=true&page=2),
// so a link can be shared and a refresh keeps them [AC-DISC-07].
const RestaurantsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // The URL is the single source of truth. "" means "not set".
  const filters = {
    q: searchParams.get("q") || "",
    cuisine: searchParams.get("cuisine") || "",
    openNow: searchParams.get("openNow") || "",
    sort: searchParams.get("sort") || "",
    page: Number(searchParams.get("page")) || 1,
  };

  // What is in the search box. It changes on every key press; the URL only after a pause.
  const [searchText, setSearchText] = useState(filters.q);

  // If the URL's search changes some other way (Back button, a shared link),
  // put that text in the box too. React allows setting state during render like this
  // when it is guarded by a check, and it is cheaper than an extra useEffect.
  const [lastUrlSearch, setLastUrlSearch] = useState(filters.q);
  if (filters.q !== lastUrlSearch) {
    setLastUrlSearch(filters.q);
    if (searchText.trim() !== filters.q) {
      setSearchText(filters.q);
    }
  }

  // Debounce: each key press restarts a 300 ms timer. Only when typing stops does the
  // timer finish and put the text in the URL, so we send one request, not one per letter.
  useEffect(() => {
    const timer = setTimeout(() => {
      const wanted = searchText.trim();

      // The server needs at least 2 letters; 1 letter waits for the next one
      if (wanted.length === 1) {
        return;
      }

      // Already in the URL: nothing to do (this also stops an endless loop)
      if (wanted === (searchParams.get("q") || "")) {
        return;
      }

      const next = new URLSearchParams(searchParams);
      if (wanted === "") {
        next.delete("q");
      } else {
        next.set("q", wanted);
      }
      // A new search starts again from page 1
      next.delete("page");
      // replace: typing doesn't fill the Back button history with half-words
      setSearchParams(next, { replace: true });
    }, SEARCH_DELAY_MS);

    // Runs before the next timer starts: cancel the old one
    return () => clearTimeout(timer);
  }, [searchText, searchParams, setSearchParams]);

  const { data, isPending, isFetching, error, refetch } = useQuery({
    // The key names this exact list: any filter change means a new fetch
    queryKey: ["restaurants", filters],
    queryFn: () => getRestaurantsRequest(filters),
    // Keep showing the old list while the new one loads, instead of flashing skeletons
    placeholderData: keepPreviousData,
  });

  // changes is e.g. { cuisine: "pizza" } or { openNow: "" }. Empty values are removed from the URL.
  const handleFilterChange = (changes) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value === "") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }
    // Different filters, different results: go back to page 1
    next.delete("page");
    setSearchParams(next);
  };

  const handleChangePage = (newPage) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(newPage));
    setSearchParams(next);
    window.scrollTo(0, 0);
  };

  const handleClearFilters = () => {
    setSearchText("");
    setSearchParams({});
  };

  const hasFilters = filters.q || filters.cuisine || filters.openNow;

  return (
    <Container>
      <section className="py-8">
        <Heading level={1}>Restaurants in Kumasi</Heading>
        <Text muted className="mt-1">
          Order from local kitchens and get it delivered to your door.
        </Text>

        <div className="mt-6">
          <RestaurantFilters
            searchText={searchText}
            filters={filters}
            onSearchChange={setSearchText}
            onFilterChange={handleFilterChange}
            onClear={handleClearFilters}
          />
        </div>

        {/* Fades the old list a little while the new one loads */}
        <div className={isFetching && !isPending ? "mt-6 opacity-60" : "mt-6"}>
          <RestaurantList
            data={data}
            isPending={isPending}
            error={error}
            hasFilters={hasFilters}
            onRetry={refetch}
            onClearFilters={handleClearFilters}
            onChangePage={handleChangePage}
          />
        </div>
      </section>
    </Container>
  );
};

// Loading, error, empty or the list itself: one of the four, never a blank screen [AC-UX-02 to 04]
const RestaurantList = ({
  data,
  isPending,
  error,
  hasFilters,
  onRetry,
  onClearFilters,
  onChangePage,
}) => {
  if (isPending) {
    return <ListSkeleton />;
  }

  if (error) {
    return <ErrorState message={error.message} onRetry={onRetry} />;
  }

  // Nothing matched the search or filters: say so, and offer the way out [AC-DISC-09]
  if (data.restaurants.length === 0 && hasFilters) {
    return (
      <EmptyState
        icon={SearchX}
        title="No matches"
        message="Try another dish or cuisine, or clear your filters to see every restaurant."
        action={{ label: "Clear filters", onClick: onClearFilters }}
      />
    );
  }

  if (data.restaurants.length === 0) {
    return (
      <EmptyState
        icon={Store}
        title="No restaurants yet"
        message="Kitchens near you are joining CibusHub. Check back soon."
      />
    );
  }

  return (
    <>
      {/* 1 column on phones, 2 on tablets, 3 on laptops */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.restaurants.map((restaurant) => (
          <RestaurantCard key={restaurant.id} restaurant={restaurant} />
        ))}
      </div>

      <Pagination meta={data.meta} onChangePage={onChangePage} />
    </>
  );
};

// Grey cards the same size as real ones while the list loads
const ListSkeleton = () => {
  const placeholders = [1, 2, 3, 4, 5, 6];

  return (
    <div role="status" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <span className="sr-only">Loading restaurants</span>
      {placeholders.map((number) => (
        <div key={number} className="overflow-hidden rounded-lg border border-border">
          <Skeleton className="aspect-video w-full rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
};

// "Previous  Page 2 of 5  Next". Hidden when everything fits on one page.
const Pagination = ({ meta, onChangePage }) => {
  if (meta.totalPages <= 1) {
    return null;
  }

  const isFirstPage = meta.page <= 1;
  const isLastPage = meta.page >= meta.totalPages;

  return (
    <nav aria-label="Pages" className="mt-8 flex items-center justify-between gap-4">
      <button
        type="button"
        disabled={isFirstPage}
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
        disabled={isLastPage}
        onClick={() => onChangePage(meta.page + 1)}
        className="min-h-11 rounded-md border border-border px-4 font-bold disabled:opacity-40"
      >
        Next
      </button>
    </nav>
  );
};

export default RestaurantsPage;
