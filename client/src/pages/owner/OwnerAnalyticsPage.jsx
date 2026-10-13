import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Store } from "lucide-react";
import Container from "@/layouts/Container";
import Text from "@/components/typography/Text";
import StatTile from "@/components/common/StatTile";
import Card from "@/components/common/Card";
import Skeleton from "@/components/common/Skeleton";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import RangePicker from "@/components/analytics/RangePicker";
import DailyBarChart from "@/components/analytics/DailyBarChart";
import HorizontalBarChart from "@/components/analytics/HorizontalBarChart";
import { MONEY_AXIS_MIN_TOP, cedisTick } from "@/components/analytics/chartTheme";
import RatingChart from "@/components/owner/analytics/RatingChart";
import { getMyRestaurantsRequest, getRestaurantAnalyticsRequest } from "@/api/ownerAnalytics";
import { formatDay } from "@/utils/date";
import { presetRange, rangeProblem } from "@/utils/dateRange";
import { formatMoney } from "@/utils/money";
import PageHeader from "@/components/common/PageHeader";

// /owner/analytics: how one of my restaurants is doing [AC-ANL-03].
// Only my own restaurants: the server returns 404 for anyone else's.
const OwnerAnalyticsPage = () => {
  const [range, setRange] = useState(() => ({ preset: "7", ...presetRange("7") }));
  // Empty until the owner picks one: the first restaurant is shown
  const [chosenId, setChosenId] = useState("");

  const restaurants = useQuery({
    queryKey: ["owner-restaurants"],
    queryFn: getMyRestaurantsRequest,
  });

  const restaurantList = restaurants.data || [];
  // Until the owner picks one: the restaurant that had an order most recently (the one they
  // most likely want to see), or their newest restaurant if none has orders yet
  const busiest = [...restaurantList].sort((a, b) =>
    (b.lastOrderAt || "").localeCompare(a.lastOrderAt || ""),
  )[0];
  const restaurantId = chosenId || (busiest ? busiest.id : "");
  const problem = rangeProblem(range);

  const analytics = useQuery({
    queryKey: ["owner-analytics", restaurantId, range.from, range.to],
    queryFn: () => getRestaurantAnalyticsRequest({ restaurantId, ...range }),
    enabled: restaurantId !== "" && problem === "",
    placeholderData: keepPreviousData,
  });

  if (restaurants.isPending) {
    return (
      <Container>
        <section className="py-8" role="status">
          <span className="sr-only">Loading</span>
          <Skeleton className="h-96 w-full" />
        </section>
      </Container>
    );
  }
  if (restaurants.error) {
    return (
      <Container>
        <section className="py-8">
          <ErrorState message={restaurants.error.message} onRetry={restaurants.refetch} />
        </section>
      </Container>
    );
  }
  if (restaurantList.length === 0) {
    return (
      <Container>
        <section className="py-8">
          <EmptyState
            icon={Store}
            title="No restaurant yet"
            message="Your numbers show here once your restaurant is set up."
          />
        </section>
      </Container>
    );
  }

  return (
    <Container>
      <section className="py-8">
        <PageHeader
          title="Analytics"

          actions={
            <>
              <RangePicker range={range} onChange={setRange} />
            </>
          }
        />

        {/* Only owners with more than one restaurant need to choose */}
        {restaurantList.length > 1 && (
          <label className="mt-4 block max-w-sm">
            <span className="text-[15px] font-bold">Restaurant</span>
            <select
              value={restaurantId}
              onChange={(event) => setChosenId(event.target.value)}
              className="mt-2 h-12 w-full rounded-md border border-input bg-background px-3 text-base"
            >
              {restaurantList.map((restaurant) => (
                <option key={restaurant.id} value={restaurant.id}>
                  {restaurant.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {problem && (
          <p role="alert" className="mt-3 text-[15px] text-destructive">
            {problem}
          </p>
        )}

        <div
          className={"mt-6" + (analytics.isFetching && analytics.data ? " opacity-60" : "")}
          aria-busy={analytics.isFetching}
        >
          <AnalyticsBody
            data={analytics.data}
            isPending={analytics.isPending}
            error={analytics.error}
            onRetry={analytics.refetch}
          />
        </div>

        <Text size="small" muted className="mt-4">
          Orders count on the day they were paid. Earnings are your share (food minus commission) of
          delivered orders. Updated every 2 minutes.
        </Text>
      </section>
    </Container>
  );
};

const AnalyticsBody = ({ data, isPending, error, onRetry }) => {
  if (error) {
    return <ErrorState message={error.message} onRetry={onRetry} />;
  }
  if (isPending || !data) {
    return (
      <div role="status" className="grid gap-4 lg:grid-cols-2">
        <span className="sr-only">Loading the charts</span>
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  const bestSellerRows = data.bestSellers.map((dish) => ({
    name: dish.name,
    value: dish.quantity,
  }));

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:gap-4">
        <StatTile label="Paid orders" value={data.totals.orders} />
        <StatTile label="Your earnings" value={formatMoney(data.totals.earningsPesewas)} />
        <StatTile
          label="Average rating"
          value={
            data.totals.averageRating === null
              ? "No reviews"
              : data.totals.averageRating.toFixed(1) + " ★"
          }
          note={data.totals.reviews > 0 ? data.totals.reviews + " reviews" : null}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <DailyBarChart
          title="Orders per day"
          summary={data.totals.orders + " paid orders in this period."}
          days={data.days}
          dataKey="orders"
          name="Orders"
        />
        <DailyBarChart
          title="Earnings per day"
          summary={"You earned " + formatMoney(data.totals.earningsPesewas) + " in this period."}
          days={data.days}
          dataKey="earningsPesewas"
          name="Earnings"
          formatValue={formatMoney}
          axisFormat={cedisTick}
          axisWidth={84}
          minTop={MONEY_AXIS_MIN_TOP}
        />
        <HorizontalBarChart
          title="Best sellers"
          summary={
            bestSellerRows.map((row) => row.name + ": " + row.value + " sold").join(", ") ||
            "Nothing sold."
          }
          rows={bestSellerRows}
          valueName="Sold"
          emptyText="Nothing sold in this period."
        />
        <RatingChart days={data.days} totals={data.totals} />
      </div>

      <DaysTable days={data.days} />
    </>
  );
};

// The same numbers as a table, for anyone who can't read the charts [AC-UX-08]
const DaysTable = ({ days }) => {
  return (
    <Card as="details" padding="none" className="mt-4">
      <summary className="min-h-12 cursor-pointer px-4 py-3 font-bold">
        Show the numbers as a table
      </summary>
      <div className="overflow-x-auto px-4 pb-4">
        <table className="w-full text-left text-[15px]">
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="py-2 pr-4">
                Day
              </th>
              <th scope="col" className="py-2 pr-4 text-right">
                Orders
              </th>
              <th scope="col" className="py-2 pr-4 text-right">
                Earnings
              </th>
              <th scope="col" className="py-2 text-right">
                Rating
              </th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day.day} className="border-b border-border last:border-0">
                <th scope="row" className="py-2 pr-4 font-normal whitespace-nowrap">
                  {formatDay(day.day)}
                </th>
                <td className="py-2 pr-4 text-right">{day.orders}</td>
                <td className="py-2 pr-4 text-right whitespace-nowrap">
                  {formatMoney(day.earningsPesewas)}
                </td>
                <td className="py-2 text-right whitespace-nowrap">
                  {day.averageRating === null
                    ? "—"
                    : day.averageRating.toFixed(1) + " (" + day.reviews + ")"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default OwnerAnalyticsPage;
