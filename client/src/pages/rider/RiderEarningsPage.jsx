import { useSearchParams } from "react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Package, Undo2, Wallet } from "lucide-react";
import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import StatTile from "@/components/common/StatTile";
import Skeleton from "@/components/common/Skeleton";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import { getEarningsRequest } from "@/api/riderWork";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/utils/money";
import { formatDistance } from "@/utils/distance";
import { formatDay, formatMonth, formatRange, formatTime, todayInGhana } from "@/utils/date";
import { List, ListIcon, ListRow } from "@/components/common/List";

const PERIODS = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

// /rider/earnings: completed deliveries and what they earned, per day, week or month
// [AC-RIDER-07]. Period, day and page live in the address (?period=week&date=2026-10-10),
// so a refresh or the back button keeps them.
const RiderEarningsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const today = todayInGhana();
  const period = searchParams.get("period") || "day";
  // A future day in the address (typed or old link) shows today instead
  const askedDate = searchParams.get("date") || today;
  const date = askedDate > today ? today : askedDate;
  const page = Number(searchParams.get("page")) || 1;

  // Changes the period or day (back to page 1), or the page; defaults stay out of the address
  const changeFilters = (changes) => {
    const next = { period, date, page: 1, ...changes };
    const params = {};
    if (next.period !== "day") {
      params.period = next.period;
    }
    if (next.date !== today) {
      params.date = next.date;
    }
    if (next.page > 1) {
      params.page = String(next.page);
    }
    setSearchParams(params);
  };

  // "max" stops the calendar from offering future days, but a date can still be typed
  // (or put in the address), so anything after today becomes today
  const handleDateChange = (event) => {
    const picked = event.target.value;
    if (!picked || picked > today) {
      changeFilters({ date: today });
      return;
    }
    changeFilters({ date: picked });
  };

  const query = useQuery({
    queryKey: ["rider-earnings", { period, date, page }],
    queryFn: () => getEarningsRequest({ period, date, page }),
    // Keep showing the last numbers while the next period loads (no flashing)
    placeholderData: keepPreviousData,
  });

  return (
    <Container>
      <section className="flex flex-col gap-4 py-6">
        <Heading level={1}>Earnings</Heading>

        {/* Day / Week / Month: one choice, like radio buttons */}
        <div role="radiogroup" aria-label="Period" className="grid grid-cols-3 gap-2">
          {PERIODS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={period === option.value}
              onClick={() => changeFilters({ period: option.value })}
              className={cn(
                "min-h-11 rounded-lg border font-bold",
                period === option.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <label className="flex flex-col gap-1 text-[15px] font-bold">
          {period === "day" ? "Day" : "Any day in the " + period}
          <input
            type="date"
            value={date}
            max={today}
            onChange={handleDateChange}
            className="h-12 rounded-lg border border-input bg-white px-3 text-base font-normal dark:bg-card"
          />
        </label>

        <EarningsSummary query={query} period={period} date={date} />
        <EarningsList query={query} onChangePage={(next) => changeFilters({ page: next })} />
      </section>
    </Container>
  );
};

// The total for the period: what was earned and from how many deliveries
const EarningsSummary = ({ query, period, date }) => {
  if (query.isPending) {
    return <Skeleton className="h-28 w-full" />;
  }
  if (query.error) {
    return null; // the list below shows the error and "Try again"
  }

  const { summary } = query.data;
  let title = formatDay(date);
  if (period === "week") {
    title = formatRange(summary.from, summary.to);
  }
  if (period === "month") {
    title = formatMonth(date);
  }

  return (
    <StatTile
      size="lg"
      label={title}
      value={formatMoney(summary.earningsPesewas)}
      note={summary.deliveryCount + " " + (summary.deliveryCount === 1 ? "delivery" : "deliveries")}
    />
  );
};

// Loading, error, empty, or the deliveries with page buttons [AC-UX-02 to 04]
const EarningsList = ({ query, onChangePage }) => {
  if (query.isPending) {
    return (
      <div role="status" className="space-y-3">
        <span className="sr-only">Loading deliveries</span>
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }
  if (query.error) {
    return <ErrorState message={query.error.message} onRetry={query.refetch} />;
  }

  const { deliveries, meta } = query.data;
  if (deliveries.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="No deliveries"
        message="Completed deliveries in this period show here."
      />
    );
  }

  return (
    <>
      <List>
        {deliveries.map((delivery) => (
          <ListRow
            key={delivery.deliveryId}
            leading={<ListIcon icon={delivery.outcome === "RETURNED" ? Undo2 : Package} />}
            title={delivery.restaurantName}
            trailing={formatMoney(delivery.earningsPesewas)}
            meta={
              <>
                {/* Food taken back to the restaurant pays 1.5x (ADR 003) */}
                {delivery.outcome === "RETURNED" && (
                  <span className="block font-bold text-amber-700 dark:text-amber-400">
                    Returned to the restaurant · 1.5x
                  </span>
                )}
                {formatDay(delivery.settledAt.slice(0, 10))} · {formatTime(delivery.settledAt)} ·{" "}
                {delivery.restaurantArea} → {delivery.dropoffArea || "customer"} ·{" "}
                {formatDistance(delivery.distanceMetres)} · {delivery.orderNumber}
              </>
            }
          />
        ))}
      </List>

      {meta.totalPages > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-between gap-4">
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

export default RiderEarningsPage;
