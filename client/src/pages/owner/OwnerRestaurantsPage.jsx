import { Link, useLocation } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Store } from "lucide-react";
import Container from "@/layouts/Container";
import PageHeader from "@/components/common/PageHeader";
import Skeleton from "@/components/common/Skeleton";
import EmptyState from "@/components/common/EmptyState";
import ErrorState from "@/components/common/ErrorState";
import Alert from "@/components/common/Alert";
import Card from "@/components/common/Card";
import StatusBadge from "@/components/common/StatusBadge";
import { List, ListIcon, ListRow } from "@/components/common/List";
import { getMyRestaurantsRequest } from "@/api/ownerRestaurants";
import { RESTAURANT_STATUSES } from "@/data/restaurantStatuses";
import { useAuthStore } from "@/store/authStore";

const ADD_BUTTON =
  "inline-flex min-h-11 items-center gap-1 rounded-md bg-primary px-4 font-bold text-primary-foreground " +
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none";

// /owner/restaurants: my restaurants and where each one stands [AC-REST-08].
// Also the first stop for a new owner (still waiting for approval): register, then wait.
const OwnerRestaurantsPage = () => {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  // Set by the register page after a restaurant is sent
  const justSent = location.state?.justSent;

  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["owner-restaurants"],
    queryFn: getMyRestaurantsRequest,
  });

  return (
    <Container>
      <section className="mx-auto max-w-2xl py-8">
        <PageHeader
          title="My restaurants"
          subtitle="Register a restaurant, then our team checks it before customers can order."
          actions={
            data && data.length > 0 ? (
              <Link to="/owner/restaurants/new" className={ADD_BUTTON}>
                <Plus size={18} aria-hidden="true" />
                Add a restaurant
              </Link>
            ) : null
          }
        />

        {justSent && (
          <Alert tone="success" className="mt-6">
            {justSent} was sent for review. Next: upload your documents so our team can check it.
          </Alert>
        )}

        {/* A new owner: what happens while they wait */}
        {user.status === "PENDING_APPROVAL" && data && data.length > 0 && (
          <Card tone="quiet" className="mt-6 text-[15px]">
            <p className="font-bold">What happens next</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>Our team reviews your restaurant, usually within 1 to 2 working days.</li>
              <li>We text you at {user.phone} when it's approved.</li>
              <li>Your order board, menu and analytics open up then.</li>
            </ol>
          </Card>
        )}

        <div className="mt-6">
          {isPending && <Skeleton className="h-32 w-full" />}
          {error && <ErrorState message={error.message} onRetry={refetch} />}
          {data && data.length === 0 && (
            <EmptyState
              icon={Store}
              title="Register your restaurant"
              message="Tell us about your kitchen: name, location, cuisines and opening hours. It takes about 5 minutes."
              action={{ label: "Start", to: "/owner/restaurants/new" }}
            />
          )}
          {data && data.length > 0 && (
            <List>
              {data.map((restaurant) => {
                const status = RESTAURANT_STATUSES[restaurant.status];
                return (
                  <ListRow
                    key={restaurant.id}
                    leading={<ListIcon icon={Store} />}
                    title={restaurant.name}
                    badge={<StatusBadge label={status.label} tone={status.tone} />}
                    meta={[restaurant.area, restaurant.cuisineTags.join(" · ")]
                      .filter(Boolean)
                      .join(" · ")}
                    detail={
                      restaurant.status === "REJECTED" && restaurant.rejectionReason ? (
                        <span className="text-destructive">
                          Reason: {restaurant.rejectionReason}
                        </span>
                      ) : null
                    }
                  />
                );
              })}
            </List>
          )}
        </div>
      </section>
    </Container>
  );
};

export default OwnerRestaurantsPage;
