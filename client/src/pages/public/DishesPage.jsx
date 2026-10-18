import { Link, useSearchParams } from "react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowRight, SearchX, UtensilsCrossed } from "lucide-react";
import Container from "@/layouts/Container";
import PageHeader from "@/components/common/PageHeader";
import Skeleton from "@/components/common/Skeleton";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import Pagination from "@/components/common/Pagination";
import { Chip, ChipRow } from "@/components/common/Chips";
import FoodSearchForm from "@/components/restaurant/FoodSearchForm";
import DishCard from "@/components/restaurant/DishCard";
import { getDishesRequest } from "@/api/dishes";

// Quick switches between favourite foods, one word each (the search matches any word)
const POPULAR = ["jollof", "waakye", "fufu", "banku", "kenkey", "kelewele", "pizza", "shawarma"];

// "jollof" -> "Jollof"
const capitalise = (text) => text.charAt(0).toUpperCase() + text.slice(1);

// /dishes?q=jollof: the same dish from every kitchen that cooks it, so customers compare
// photos, prices and places side by side. Dishes you can order now come first.
// The search and filters live in the URL, so a link can be shared and Back works.
const DishesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = {
    q: (searchParams.get("q") || "").trim(),
    openNow: searchParams.get("openNow") || "",
    page: Number(searchParams.get("page")) || 1,
  };
  // The server needs at least 2 letters
  const canSearch = filters.q.length >= 2;

  const { data, isPending, isFetching, error, refetch } = useQuery({
    queryKey: ["dishes", filters],
    queryFn: () => getDishesRequest(filters),
    enabled: canSearch,
    // Keep showing the old dishes while the new ones load, instead of flashing skeletons
    placeholderData: keepPreviousData,
  });

  // changes is e.g. { q: "waakye" } or { openNow: "" }. Empty values leave the URL.
  const changeFilters = (changes) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value === "") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }
    // A different search starts again from page 1
    next.delete("page");
    setSearchParams(next);
  };

  const handleChangePage = (newPage) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(newPage));
    setSearchParams(next);
    window.scrollTo(0, 0);
  };

  return (
    <Container>
      <section className="py-8">
        <PageHeader
          title={canSearch ? capitalise(filters.q) + " in Kumasi" : "Find a dish"}
          subtitle="The same dish from every kitchen that cooks it. Compare, then tap one to order."
        />

        {/* key: a new search (e.g. a chip) puts its words in the box */}
        <FoodSearchForm
          key={filters.q}
          to="/dishes"
          initialValue={filters.q}
          className="mt-6 max-w-none"
        />

        <ChipRow label="Filters" className="mt-3">
          <Chip
            selected={filters.openNow === "true"}
            onClick={() => changeFilters({ openNow: filters.openNow ? "" : "true" })}
          >
            Open now
          </Chip>
          {POPULAR.map((food) => (
            <Chip
              key={food}
              selected={filters.q.toLowerCase() === food}
              onClick={() => changeFilters({ q: food })}
            >
              {capitalise(food)}
            </Chip>
          ))}
        </ChipRow>

        {canSearch && (
          <Link
            to={"/restaurants?q=" + encodeURIComponent(filters.q)}
            className="mt-3 inline-flex min-h-11 items-center gap-1 font-bold text-primary"
          >
            See restaurants instead <ArrowRight size={18} aria-hidden="true" />
          </Link>
        )}

        {/* Fades the old dishes a little while the new ones load */}
        <div className={isFetching && !isPending ? "mt-4 opacity-60" : "mt-4"}>
          <DishResults
            canSearch={canSearch}
            data={data}
            isPending={isPending}
            error={error}
            hasOpenNow={filters.openNow === "true"}
            onRetry={refetch}
            onShowAll={() => changeFilters({ openNow: "" })}
            onChangePage={handleChangePage}
          />
        </div>
      </section>
    </Container>
  );
};

// Nothing searched yet, loading, error, empty, or the dishes: never a blank screen
const DishResults = ({
  canSearch,
  data,
  isPending,
  error,
  hasOpenNow,
  onRetry,
  onShowAll,
  onChangePage,
}) => {
  if (!canSearch) {
    return (
      <EmptyState
        icon={UtensilsCrossed}
        title="What would you like to eat?"
        message="Type a dish above, or tap one of the favourites."
      />
    );
  }

  if (isPending) {
    return <DishesSkeleton />;
  }

  if (error) {
    return <ErrorState message={error.message} onRetry={onRetry} />;
  }

  if (data.dishes.length === 0) {
    return (
      <EmptyState
        icon={SearchX}
        title="No dishes found"
        message={
          hasOpenNow
            ? "No open kitchen has it right now. See the ones that are closed too?"
            : "Try another word, e.g. rice, chicken or fish."
        }
        action={hasOpenNow ? { label: "Show all kitchens", onClick: onShowAll } : undefined}
      />
    );
  }

  return (
    <>
      <p className="mb-3 text-[15px] text-muted-foreground">
        {data.meta.totalItems === 1 ? "1 dish" : data.meta.totalItems + " dishes"}
      </p>
      {/* 2 columns on phones (like a food app), 3 on tablets, 4 on laptops */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {data.dishes.map((dish) => (
          <DishCard key={dish.id} dish={dish} />
        ))}
      </div>
      <Pagination meta={data.meta} onChangePage={onChangePage} />
    </>
  );
};

// Grey cards the same shape as real ones while the dishes load
const DishesSkeleton = () => {
  const placeholders = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div role="status" className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      <span className="sr-only">Loading dishes</span>
      {placeholders.map((number) => (
        <div key={number} className="overflow-hidden rounded-lg border border-border">
          <Skeleton className="aspect-4/3 w-full rounded-none" />
          <div className="space-y-2 p-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default DishesPage;
