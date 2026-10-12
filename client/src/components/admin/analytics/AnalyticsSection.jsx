import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import Card from "@/components/common/Card";
import Skeleton from "@/components/common/Skeleton";
import ErrorState from "@/components/common/ErrorState";
import { getAdminAnalyticsRequest } from "@/api/admin";
import { ORDER_STATUSES } from "@/data/orderStatuses";
import { formatDay, todayInGhana } from "@/utils/date";
import { formatMoney } from "@/utils/money";
import RangePicker from "./RangePicker";
import OrdersPerDayChart from "./OrdersPerDayChart";
import MoneyPerDayChart from "./MoneyPerDayChart";
import HorizontalBarChart from "./HorizontalBarChart";
import OperationsTiles from "./OperationsTiles";

const DAY_MS = 24 * 60 * 60 * 1000;
// The server's limit (validators/admin/analytics.validator.js)
const MAX_RANGE_DAYS = 92;

// "2026-10-09" moved by a number of days
const addDays = (dayText, count) =>
  new Date(new Date(dayText + "T00:00:00Z").getTime() + count * DAY_MS).toISOString().slice(0, 10);

// The days a preset covers, ending today in Ghana
const presetRange = (preset) => {
  const today = todayInGhana();
  if (preset === "today") return { from: today, to: today };
  return { from: addDays(today, -(Number(preset) - 1)), to: today };
};

// What's wrong with a custom range, or "" when it is fine
const rangeProblem = ({ from, to }) => {
  if (!from || !to) return "Choose both dates.";
  if (from > to) return "The start date must be before the end date.";
  const days = (new Date(to).getTime() - new Date(from).getTime()) / DAY_MS + 1;
  if (days > MAX_RANGE_DAYS) return "Choose " + MAX_RANGE_DAYS + " days or fewer.";
  return "";
};

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
        <RangePicker range={range} onChange={setRange} presetRange={presetRange} />
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
        <OrdersPerDayChart days={data.days} total={data.totals.orders} />
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
