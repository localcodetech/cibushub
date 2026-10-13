import { useQuery } from "@tanstack/react-query";
import { MapPinOff } from "lucide-react";
import Container from "@/layouts/Container";
import Skeleton from "@/components/common/Skeleton";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import RidersMap from "@/components/map/RidersMap";
import { getLiveRidersRequest } from "@/api/admin";
import { VEHICLE_NAMES } from "@/data/riderStatuses";
import { formatTime } from "@/utils/date";
import Avatar from "@/components/common/Avatar";
import { List, ListRow } from "@/components/common/List";
import PageHeader from "@/components/common/PageHeader";

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
        <PageHeader
          back={{ to: "/admin/riders", label: "Riders" }}
          title="Riders online"
          subtitle="Blue: free. Orange: on a delivery. Updates every 15 seconds."
        />

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
      <List className="mt-6">
        {data.map((rider) => (
          <ListRow
            key={rider.id}
            to={"/admin/riders/" + rider.id}
            leading={<Avatar name={rider.fullName} />}
            title={rider.fullName}
            meta={
              VEHICLE_NAMES[rider.vehicleType] +
              " · " +
              (rider.location ? "seen " + formatTime(rider.location.at) : "no position yet")
            }
            trailing={
              rider.delivery ? (
                rider.delivery.orderNumber
              ) : (
                <span className="text-success">Free</span>
              )
            }
          />
        ))}
      </List>
    </>
  );
};

export default AdminRiderMapPage;
