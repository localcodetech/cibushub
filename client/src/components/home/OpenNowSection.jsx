import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import Skeleton from "@/components/common/Skeleton";
import RestaurantCard from "@/components/restaurant/RestaurantCard";
import { getRestaurantsRequest } from "@/api/restaurants";

const SHOWN = 6;

// Restaurants taking orders right now (real ones, from the same list as /restaurants).
// Hidden when the request fails or nothing is open: the page still works without it.
const OpenNowSection = () => {
  const { data, isPending, isError } = useQuery({
    queryKey: ["restaurants", { openNow: "true", page: 1, home: true }],
    queryFn: () => getRestaurantsRequest({ openNow: "true", page: 1 }),
  });

  if (isError || (data && data.restaurants.length === 0)) {
    return null;
  }

  return (
    <section className="py-12">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Heading level={2}>Open now in Kumasi</Heading>
            <Text muted className="mt-1">
              Kitchens taking orders right now. Browse without an account.
            </Text>
          </div>
          <Link
            to="/restaurants?openNow=true"
            className="inline-flex min-h-11 items-center gap-1 font-bold text-primary"
          >
            See all <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isPending ? (
            <>
              <span role="status" className="sr-only">
                Loading restaurants
              </span>
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
            </>
          ) : (
            data.restaurants
              .slice(0, SHOWN)
              .map((restaurant) => <RestaurantCard key={restaurant.id} restaurant={restaurant} />)
          )}
        </div>
      </Container>
    </section>
  );
};

export default OpenNowSection;
