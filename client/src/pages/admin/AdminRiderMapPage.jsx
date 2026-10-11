import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPinOff } from "lucide-react";
import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import Skeleton from "@/components/common/Skeleton";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import RidersMap from "@/components/map/RidersMap";
import { getLiveRidersRequest } from "@/api/admin";
import { VEHICLE_NAMES } from "@/data/riderStatuses";
import { formatTime } from "@/utils/date";

// How often the map asks for fresh positions
const REFRESH_MS = 15 * 1000;

// /admin/riders/map: every online rider, where they are and what they are doing [AC-ADM-04]
const AdminRiderMapPage = () => {
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["admin-live-riders"],
    queryFn: getLiveRidersRequest,
    // Fetch again every 15 seconds while the page is open
    refetchInterval: REFRESH_MS,
  });

  return (
    <Container>
      <section className="py-8">
        <Link to="/admin/riders" className="text-[15px] font-bold text-primary">
          ← Riders
        </Link>
        <Heading level={1} className="mt-3">
          Riders online
        </Heading>
        <Text muted className="mt-1">
          Blue: free. Orange: on a delivery. Updates every 15 seconds.
        </Text>

        <div className="mt-6">
          <LiveRiders data={data} isPending={isPending} error={error} onRetry={refetch} />
        </div>
      </section>
    </Container>
  );
};

const LiveRiders = ({ data, isPending, error, onRetry }) => {
  if (isPending) {
    return (
      <div role="status">
        <span className="sr-only">Loading the map</span>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error.message} onRetry={onRetry} />;
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={MapPinOff}
        title="No riders online"
        message="Riders appear here when they go online."
      />
    );
  }

  return (
    <>
      <RidersMap riders={data} />
      <ul className="mt-6 divide-y divide-border rounded-lg border border-border bg-card">
        {data.map((rider) => (
          <li key={rider.id}>
            <Link
              to={"/admin/riders/" + rider.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
            >
              <div>
                <p className="font-bold">{rider.fullName}</p>
                <p className="text-[13px] text-muted-foreground">
                  {VEHICLE_NAMES[rider.vehicleType]} ·{" "}
                  {rider.location ? "seen " + formatTime(rider.location.at) : "no position yet"}
                </p>
              </div>
              <span className="text-[15px] font-bold">
                {rider.delivery ? rider.delivery.orderNumber : "Free"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
};

export default AdminRiderMapPage;
