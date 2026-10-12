import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleAlert, CircleCheck } from "lucide-react";
import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import Card from "@/components/common/Card";
import Skeleton from "@/components/common/Skeleton";
import ErrorState from "@/components/common/ErrorState";
import AnalyticsSection from "@/components/admin/analytics/AnalyticsSection";
import { getAdminDashboardRequest } from "@/api/admin";
import { ORDER_STATUSES } from "@/data/orderStatuses";
import { onLiveEvent, onOrderUpdated } from "@/lib/liveUpdates";
import { formatMoney } from "@/utils/money";
import { cn } from "@/lib/utils";

// What each alert means, in the order they are shown
const ALERTS = [
  { key: "ordersWithoutRider", label: "Orders with no rider for 10+ minutes" },
  { key: "amountMismatches", label: "Payments with the wrong amount" },
  { key: "stuckPayments", label: "Payments stuck pending (30+ minutes)" },
  { key: "failedRefunds", label: "Refunds that failed" },
  { key: "failedMessages", label: "Emails or SMS that failed (last 24 hours)" },
];

// "1 restaurant", "2 restaurants"
const countOf = (count, word) => count + " " + word + (count === 1 ? "" : "s");

// /admin: the first thing an admin sees [AC-ADM-01]
const AdminDashboardPage = () => {
  const queryClient = useQueryClient();

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: getAdminDashboardRequest,
  });

  // Live: any order change or admin alert means the numbers moved, so fetch them again
  useEffect(() => {
    const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    const stopOrders = onOrderUpdated(refresh);
    const stopAlerts = onLiveEvent("admin:alert", refresh);
    return () => {
      stopOrders();
      stopAlerts();
    };
  }, [queryClient]);

  return (
    <Container>
      <section className="py-8">
        <Heading level={1}>Overview</Heading>
        <div className="mt-6">
          <DashboardBody data={data} isPending={isPending} error={error} onRetry={refetch} />
        </div>
        <AnalyticsSection />
      </section>
    </Container>
  );
};

// Loading, error or the numbers [AC-UX-02, AC-UX-04]
const DashboardBody = ({ data, isPending, error, onRetry }) => {
  if (isPending) {
    return (
      <div role="status" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <span className="sr-only">Loading the overview</span>
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error.message} onRetry={onRetry} />;
  }

  const activeTotal = Object.values(data.activeOrders).reduce((sum, count) => sum + count, 0);
  const pendingTotal = data.pendingApprovals.restaurants + data.pendingApprovals.riders;

  return (
    <>
      {/* The headline numbers: two a row on phones, four on laptops */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Stat label="Orders paid today" value={data.today.paidOrders} />
        <Stat label="GMV today" value={formatMoney(data.today.gmvPesewas)} />
        <Stat label="Riders online" value={data.onlineRiders} />
        <Stat
          label="Waiting for approval"
          value={pendingTotal}
          note={
            countOf(data.pendingApprovals.restaurants, "restaurant") +
            " · " +
            countOf(data.pendingApprovals.riders, "rider")
          }
        />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section>
          <Heading level={2}>Needs attention</Heading>
          <AlertList alerts={data.alerts} />
        </section>

        <section>
          <Heading level={2}>Active orders ({activeTotal})</Heading>
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-card">
            {Object.entries(data.activeOrders).map(([status, count]) => (
              <li key={status} className="flex items-center justify-between px-4 py-3">
                <span>{ORDER_STATUSES[status] ? ORDER_STATUSES[status].label : status}</span>
                <span className="font-bold">{count}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <Text size="small" muted className="mt-6">
        "Today" starts at midnight Ghana time. GMV is the total customers paid, before refunds.
      </Text>
    </>
  );
};

const Stat = ({ label, value, note }) => {
  return (
    <Card>
      <p className="text-[15px] text-muted-foreground">{label}</p>
      <p className="mt-1 font-heading text-2xl font-bold sm:text-3xl">{value}</p>
      {note && (
        <Text size="small" muted className="mt-1">
          {note}
        </Text>
      )}
    </Card>
  );
};

// The alerts that have something in them stand out; when there are none, say so
const AlertList = ({ alerts }) => {
  const anyAlerts = ALERTS.some((alert) => alerts[alert.key] > 0);

  if (!anyAlerts) {
    return (
      <p className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3">
        <CircleCheck size={20} className="text-primary" aria-hidden="true" />
        All clear: nothing needs attention right now.
      </p>
    );
  }

  return (
    <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-card">
      {ALERTS.map((alert) => {
        const count = alerts[alert.key];
        const hasProblem = count > 0;
        return (
          <li
            key={alert.key}
            className={cn(
              "flex items-center justify-between gap-3 px-4 py-3",
              hasProblem ? "text-destructive" : "text-muted-foreground",
            )}
          >
            <span className="flex items-center gap-2">
              {hasProblem && <CircleAlert size={18} aria-hidden="true" />}
              {alert.label}
            </span>
            <span className="font-bold">{count}</span>
          </li>
        );
      })}
    </ul>
  );
};

export default AdminDashboardPage;
