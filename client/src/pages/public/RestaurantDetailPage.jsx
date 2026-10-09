import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Store } from "lucide-react";
import Container from "@/layouts/Container";
import Skeleton from "@/components/common/Skeleton";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import RestaurantHeader from "@/components/restaurant/RestaurantHeader";
import OpeningHours from "@/components/restaurant/OpeningHours";
import MenuSection from "@/components/restaurant/MenuSection";
import ViewCartBar from "@/components/cart/ViewCartBar";
import { getRestaurantRequest } from "@/api/restaurants";

// /restaurants/:restaurantId: one restaurant's profile, hours and menu [AC-DISC-10].
const RestaurantDetailPage = () => {
  // useParams reads the :restaurantId part of the address
  const { restaurantId } = useParams();

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["restaurant", restaurantId],
    queryFn: () => getRestaurantRequest(restaurantId),
    // A 404 won't change by asking again, so don't retry it
    retry: (failureCount, error) => error.status !== 404 && failureCount < 3,
  });

  if (isPending) {
    return <DetailSkeleton />;
  }

  // Wrong link, or a restaurant that isn't approved [AC-DISC-02]
  if (error && error.status === 404) {
    return (
      <Container>
        <EmptyState
          icon={Store}
          title="Restaurant not found"
          message="It may have closed or the link is wrong."
          action={{ label: "See all restaurants", to: "/restaurants" }}
        />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <div className="py-8">
          <ErrorState message={error.message} onRetry={refetch} />
        </div>
      </Container>
    );
  }

  return (
    <Container>
      {/* pb-24 leaves room at the bottom for the View cart bar */}
      <div className="py-6 pb-24">
        <RestaurantHeader restaurant={data} />

        {/* Phones: menu, then hours below it. Laptops: menu on the left, hours on the right */}
        <div className="mt-6 grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <MenuSection restaurant={data} />
          </div>
          <aside>
            <OpeningHours openingHours={data.openingHours} />
          </aside>
        </div>
      </div>

      <ViewCartBar restaurantId={data.id} />
    </Container>
  );
};

// Grey blocks in the shape of the page while it loads
const DetailSkeleton = () => {
  return (
    <Container>
      <div role="status" className="space-y-4 py-6">
        <span className="sr-only">Loading restaurant</span>
        <Skeleton className="aspect-21/9 w-full rounded-lg" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <div className="space-y-3 pt-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    </Container>
  );
};

export default RestaurantDetailPage;
