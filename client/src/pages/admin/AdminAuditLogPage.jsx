import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import Skeleton from "@/components/common/Skeleton";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import { getAuditActionsRequest, getAuditLogsRequest } from "@/api/admin";
import { ROLE_NAMES } from "@/data/userLabels";
import { formatDateTime } from "@/utils/date";

// What each kind of target is called, and where its page is (if it has one)
const TARGETS = {
  order: { label: "Order", path: "/admin/orders/" },
  restaurant: { label: "Restaurant", path: "/admin/restaurants/" },
  rider: { label: "Rider", path: "/admin/riders/" },
  user: { label: "User", path: "/admin/users/" },
  review: { label: "Review", path: null },
  payment: { label: "Payment", path: null },
  refund: { label: "Refund", path: null },
  setting: { label: "Setting", path: null },
};

// "USER_SUSPENDED" -> "User suspended"
const actionWords = (action) => {
  const words = action.toLowerCase().replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
};

// A value from before/after, as short text
const valueText = (value) => {
  if (value === null || value === undefined) {
    return "—";
  }
  // A map point: "6.6886, -1.6244" instead of its raw data
  if (typeof value === "object" && "latitude" in value && "longitude" in value) {
    return Number(value.latitude).toFixed(5) + ", " + Number(value.longitude).toFixed(5);
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
};

// { status: "ACTIVE" } and { status: "SUSPENDED" } -> [["status", "ACTIVE", "SUSPENDED"]]
const changesOf = (before, after) => {
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  return [...keys].map((key) => [
    key,
    valueText(before ? before[key] : undefined),
    valueText(after ? after[key] : undefined),
  ]);
};

// /admin/audit-log: every admin action, read-only [AC-ADM-07].
// ?targetId=... (from another page) shows one thing's history.
const AdminAuditLogPage = () => {
  const [searchParams] = useSearchParams();
  const targetId = searchParams.get("targetId") || "";
  const [action, setAction] = useState("");
  const [targetType, setTargetType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const filters = { action, targetType, targetId, from, to, page };
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["audit-logs", filters],
    queryFn: () => getAuditLogsRequest(filters),
    placeholderData: keepPreviousData,
  });
  const { data: actionNames = [] } = useQuery({
    queryKey: ["audit-actions"],
    queryFn: getAuditActionsRequest,
  });

  // Any filter change starts again at page 1
  const changeFilter = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };

  return (
    <Container>
      <section className="py-8">
        <Heading level={1}>Audit log</Heading>
        <Text muted className="mt-1">
          Every admin action, newest first. Nothing here can be changed or deleted.
        </Text>
        {targetId && (
          <Text className="mt-2">
            Showing one item's history.{" "}
            <Link to="/admin/audit-log" className="font-bold text-primary">
              Show everything
            </Link>
          </Text>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="sr-only">Action</span>
            <select
              value={action}
              onChange={changeFilter(setAction)}
              className="h-12 w-full rounded-md border border-input bg-background px-3 text-base"
            >
              <option value="">Every action</option>
              {actionNames.map((name) => (
                <option key={name} value={name}>
                  {actionWords(name)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="sr-only">About</span>
            <select
              value={targetType}
              onChange={changeFilter(setTargetType)}
              className="h-12 w-full rounded-md border border-input bg-background px-3 text-base"
            >
              <option value="">About anything</option>
              {Object.entries(TARGETS).map(([value, info]) => (
                <option key={value} value={value}>
                  {info.label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2 sm:col-span-2">
            <label className="block">
              <span className="text-[13px] text-muted-foreground">From</span>
              <input
                type="date"
                value={from}
                onChange={changeFilter(setFrom)}
                className="h-12 w-full rounded-md border border-input bg-background px-2 text-base"
              />
            </label>
            <label className="block">
              <span className="text-[13px] text-muted-foreground">To</span>
              <input
                type="date"
                value={to}
                onChange={changeFilter(setTo)}
                className="h-12 w-full rounded-md border border-input bg-background px-2 text-base"
              />
            </label>
          </div>
        </div>

        <div className="mt-6">
          <LogList data={data} isPending={isPending} error={error} onRetry={refetch} />
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
const LogList = ({ data, isPending, error, onRetry }) => {
  if (isPending) {
    return (
      <div role="status" className="space-y-3">
        <span className="sr-only">Loading the audit log</span>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error.message} onRetry={onRetry} />;
  }

  if (data.logs.length === 0) {
    return <EmptyState icon={ScrollText} title="Nothing recorded" />;
  }

  return (
    <ol className="divide-y divide-border rounded-lg border border-border bg-card">
      {data.logs.map((log) => {
        const target = TARGETS[log.targetType] || { label: log.targetType, path: null };
        const changes = changesOf(log.before, log.after);
        return (
          <li key={log.id} className="px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold">{actionWords(log.action)}</span>
              <span className="text-[13px] text-muted-foreground">
                {formatDateTime(log.createdAt)}
              </span>
            </div>
            <p className="text-[13px] text-muted-foreground">
              By {log.actor ? log.actor.fullName : "someone"}
              {log.actor ? " (" + (ROLE_NAMES[log.actor.role] || log.actor.role) + ")" : ""} ·{" "}
              {target.path ? (
                <Link to={target.path + log.targetId} className="underline">
                  {target.label}
                </Link>
              ) : (
                target.label
              )}
              {log.ipAddress ? " · IP " + log.ipAddress : ""}
            </p>
            {changes.length > 0 && (
              <ul className="mt-1 text-[13px]">
                {changes.map(([key, beforeValue, afterValue]) => (
                  <li key={key} className="break-all">
                    <span className="text-muted-foreground">{key}:</span> {beforeValue} →{" "}
                    {afterValue}
                  </li>
                ))}
              </ul>
            )}
            {log.reason && <p className="mt-1 text-[15px]">“{log.reason}”</p>}
          </li>
        );
      })}
    </ol>
  );
};

export default AdminAuditLogPage;
