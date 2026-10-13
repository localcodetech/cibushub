import { useState } from "react";
import { Link } from "react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Bike, Map as MapIcon } from "lucide-react";
import Container from "@/layouts/Container";
import Text from "@/components/typography/Text";
import Skeleton from "@/components/common/Skeleton";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import StatusBadge from "@/components/common/StatusBadge";
import { getAdminRidersRequest } from "@/api/admin";
import { RIDER_STATUSES, VEHICLE_NAMES } from "@/data/riderStatuses";
import { formatDateTime } from "@/utils/date";
import { List, ListRow } from "@/components/common/List";
import Avatar from "@/components/common/Avatar";
import { Chip, ChipRow } from "@/components/common/Chips";
import PageHeader from "@/components/common/PageHeader";

// The tabs, the review queue first. status "" means every rider.
const TABS = [
  { status: "PENDING_APPROVAL", label: "Waiting for review" },
  { status: "APPROVED", label: "Approved" },
  { status: "SUSPENDED", label: "Suspended" },
  { status: "REJECTED", label: "Rejected" },
  { status: "", label: "All" },
];

// /admin/riders: review applications and manage riders [AC-ADM-04]
const AdminRidersPage = () => {
  const [status, setStatus] = useState("PENDING_APPROVAL");
  const [page, setPage] = useState(1);

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["admin-riders", { status, page }],
    queryFn: () => getAdminRidersRequest({ status, page }),
    placeholderData: keepPreviousData,
  });

  const handleTab = (newStatus) => {
    setStatus(newStatus);
    setPage(1);
  };

  return (
    <Container>
      <section className="py-8">
        <PageHeader
          title="Riders"

          actions={
            <>
              <Link
                to="/admin/riders/map"
                className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-4 font-bold"
              >
                <MapIcon size={18} aria-hidden="true" />
                Live map
              </Link>
            </>
          }
        />

        <ChipRow label="Show" className="mt-6">
          {TABS.map((tab) => (
            <Chip
              key={tab.label}
              selected={status === tab.status}
              onClick={() => handleTab(tab.status)}
            >
              {tab.label}
            </Chip>
          ))}
        </ChipRow>

        <div className="mt-6">
          <RiderList
            data={data}
            isPending={isPending}
            error={error}
            onRetry={refetch}
            isQueue={status === "PENDING_APPROVAL"}
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
const RiderList = ({ data, isPending, error, onRetry, isQueue }) => {
  if (isPending) {
    return (
      <div role="status" className="space-y-3">
        <span className="sr-only">Loading riders</span>
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error.message} onRetry={onRetry} />;
  }

  if (data.riders.length === 0) {
    return (
      <EmptyState
        icon={Bike}
        title={isQueue ? "Nothing to review" : "No riders here"}
        message={isQueue ? "Rider applications show here once they are submitted." : null}
      />
    );
  }

  return (
    <List>
      {data.riders.map((rider) => {
        const statusInfo = RIDER_STATUSES[rider.status];
        return (
          <ListRow
            key={rider.id}
            to={"/admin/riders/" + rider.id}
            leading={<Avatar name={rider.rider.fullName} />}
            title={rider.rider.fullName}
            badge={<StatusBadge label={statusInfo.label} tone={statusInfo.tone} />}
            meta={
              VEHICLE_NAMES[rider.vehicleType] +
              (rider.plateNumber ? " · " + rider.plateNumber : "") +
              (rider.submittedAt ? " · sent " + formatDateTime(rider.submittedAt) : "")
            }
          />
        );
      })}
    </List>
  );
};

export default AdminRidersPage;
