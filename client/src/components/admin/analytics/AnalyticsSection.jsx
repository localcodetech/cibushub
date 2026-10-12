import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import Card from "@/components/common/Card";
import Skeleton from "@/components/common/Skeleton";
import ErrorState from "@/components/common/ErrorState";
import { getAdminAnalyticsRequest } from "@/api/admin";
import { ORDER_STATUSES } from "@/data/orderStatuses";
import { formatDay } from "@/utils/date";
import { presetRange, rangeProblem } from "@/utils/dateRange";
import { formatMoney } from "@/utils/money";
import RangePicker from "@/components/analytics/RangePicker";
import DailyBarChart from "@/components/analytics/DailyBarChart";
import HorizontalBarChart from "@/components/analytics/HorizontalBarChart";
import MoneyPerDayChart from "./MoneyPerDayChart";
import OperationsTiles from "./OperationsTiles";

// The admin charts under the overview [AC-ANL-01]. What counts is in docs/analytics.md.
const AnalyticsSection = () => {
  const [range, setRange] = useState(() => ({ preset: "7", ...presetRange("7") }));
  const problem = rangeProblem(range);

  const { data, isPending, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-analytics", range.from, range.to],
    queryFn: () => getAdminAnalyticsRequest(range),
    enabled: problem === "",
    // Keep the old charts on screen while the new period loads
    placeholderData: keepPreviousData,
  });

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Heading level={2}>Analytics</Heading>
        <RangePicker range={range} onChange={setRange} />
      </div>

      {problem && (
        <p role="alert" className="mt-3 text-[15px] text-destructive">
          {problem}
        </p>
      )}

      <div className={"mt-4" + (isFetching && data ? " opacity-60" : "")} aria-busy={isFetching}>
        <AnalyticsBody data={data} isPending={isPending} error={error} onRetry={refetch} />
      </div>

      <Text size="small" muted className="mt-4">
        Orders count on the day they were paid. "Customers paid" is after refunds. "CibusHub kept"
        is commission and service fee on delivered orders. Updated every 2 minutes.
      </Text>
    </section>
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

  // Statuses in the order an order moves through them; only those with orders
  const statusRows = Object.entries(data.ordersByStatus)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      name: ORDER_STATUSES[status] ? ORDER_STATUSES[status].label : status,
      value: count,
    }));
  const restaurantRows = data.topRestaurants.map((restaurant) => ({
    name: restaurant.name,
    value: restaurant.customerPaidPesewas,
  }));

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:gap-4">
        <Total label="Paid orders" value={data.totals.orders} />
        <Total label="Customers paid" value={formatMoney(data.totals.customerPaidPesewas)} />
        <Total label="CibusHub kept" value={formatMoney(data.totals.cibushubPesewas)} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <DailyBarChart
          title="Orders per day"
          summary={data.totals.orders + " paid orders in this period."}
          days={data.days}
          dataKey="orders"
          name="Orders"
        />
        <MoneyPerDayChart days={data.days} totals={data.totals} />
        <HorizontalBarChart
          title="Orders by status"
          summary={statusRows.map((row) => row.name + ": " + row.value).join(", ") || "No orders."}
          rows={statusRows}
          valueName="Orders"
          emptyText="No orders were placed in this period."
        />
        <HorizontalBarChart
          title="Top restaurants"
          summary={
            restaurantRows.map((row) => row.name + ": " + formatMoney(row.value)).join(", ") ||
            "No paid orders."
          }
          rows={restaurantRows}
          valueName="Customers paid"
          formatValue={formatMoney}
          labelWidth={104}
          emptyText="No paid orders in this period."
        />
      </div>

      <OperationsTiles operations={data.operations} />

      <DaysTable days={data.days} />
    </>
  );
};

const Total = ({ label, value }) => {
  return (
    <Card>
      <p className="text-[15px] text-muted-foreground">{label}</p>
      <p className="mt-1 font-heading text-2xl font-bold">{value}</p>
    </Card>
  );
};

// The same numbers as a table, for anyone who can't read the charts [AC-UX-08]
const DaysTable = ({ days }) => {
  return (
    <details className="mt-4 rounded-lg border border-border bg-card">
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
                Customers paid
              </th>
              <th scope="col" className="py-2 text-right">
                CibusHub kept
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
                  {formatMoney(day.customerPaidPesewas)}
                </td>
                <td className="py-2 text-right whitespace-nowrap">
                  {formatMoney(day.cibushubPesewas)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
};

export default AnalyticsSection;
