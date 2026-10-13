import { useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Container from "@/layouts/Container";
import PageHeader from "@/components/common/PageHeader";
import Skeleton from "@/components/common/Skeleton";
import ErrorState from "@/components/common/ErrorState";
import Alert from "@/components/common/Alert";
import Tabs from "@/components/common/Tabs";
import StatusBadge from "@/components/common/StatusBadge";
import Text from "@/components/typography/Text";
import RestaurantForm from "@/components/owner/setup/RestaurantForm";
import RestaurantStatusCard from "@/components/owner/setup/RestaurantStatusCard";
import RestaurantPhotos from "@/components/owner/setup/RestaurantPhotos";
import RestaurantDocuments from "@/components/owner/setup/RestaurantDocuments";
import {
  getMyDocumentsRequest,
  getMyRestaurantRequest,
  updateOpeningHoursRequest,
  updateRestaurantRequest,
} from "@/api/ownerRestaurants";
import { DOCUMENT_NAMES, RESTAURANT_STATUSES } from "@/data/restaurantStatuses";

const ALL_DOCUMENTS = Object.keys(DOCUMENT_NAMES).length;

// /owner/restaurants/:restaurantId: one restaurant's settings [AC-REST-01, AC-REST-03,
// AC-REST-04, AC-REST-05]. Its status (and what to do about it) on top, then three views:
// Details (the registration form, filled in), Photos, Documents.
// ?tab=documents opens straight on a view, so other pages can link to it.
const RestaurantSettingsPage = () => {
  const { restaurantId } = useParams();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "details";
  const [savedMessage, setSavedMessage] = useState("");

  const restaurantQuery = useQuery({
    queryKey: ["owner-restaurant", restaurantId],
    queryFn: () => getMyRestaurantRequest(restaurantId),
  });
  const documentsQuery = useQuery({
    queryKey: ["owner-restaurant-documents", restaurantId],
    queryFn: () => getMyDocumentsRequest(restaurantId),
    // A suspended restaurant's documents are locked (403): don't ask
    enabled: Boolean(restaurantQuery.data) && restaurantQuery.data.status !== "SUSPENDED",
  });

  // After any change: this restaurant again, and the list (its status may have changed)
  const reloadRestaurant = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["owner-restaurant", restaurantId] }),
      queryClient.invalidateQueries({ queryKey: ["owner-restaurants"] }),
    ]);
  const reloadDocuments = () =>
    queryClient.invalidateQueries({ queryKey: ["owner-restaurant-documents", restaurantId] });

  const changeTab = (newTab) => {
    setSavedMessage("");
    setSearchParams(newTab === "details" ? {} : { tab: newTab }, { replace: true });
  };

  // The server takes the hours on their own route: details first, then the week
  const handleSave = async (details) => {
    setSavedMessage("");
    const { openingHours, ...changes } = details;
    const saved = await updateRestaurantRequest(restaurantId, changes);
    await updateOpeningHoursRequest(restaurantId, openingHours);
    await reloadRestaurant();
    setSavedMessage(
      saved.status === "PENDING_APPROVAL" && restaurantQuery.data.status === "APPROVED"
        ? "Saved. The registered business name changed, so our team will check it again."
        : "Saved.",
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const restaurant = restaurantQuery.data;

  if (restaurantQuery.isPending) {
    return (
      <Container>
        <section className="mx-auto max-w-2xl space-y-4 py-8">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-96 w-full" />
        </section>
      </Container>
    );
  }

  if (restaurantQuery.error) {
    return (
      <Container>
        <section className="mx-auto max-w-2xl py-8">
          <ErrorState message={restaurantQuery.error.message} onRetry={restaurantQuery.refetch} />
        </section>
      </Container>
    );
  }

  const status = RESTAURANT_STATUSES[restaurant.status];
  const isSuspended = restaurant.status === "SUSPENDED";
  const documents = documentsQuery.data || [];
  // Documents only matter before approval (waiting for review, or rejected)
  const needsDocuments = ["PENDING_APPROVAL", "REJECTED"].includes(restaurant.status);
  const missingDocuments =
    needsDocuments && documentsQuery.data ? ALL_DOCUMENTS - documents.length : 0;

  return (
    <Container>
      <section className="mx-auto max-w-2xl py-8">
        <PageHeader
          back={{ to: "/owner/restaurants", label: "My restaurants" }}
          title={restaurant.name}
          badge={<StatusBadge label={status.label} tone={status.tone} />}
          meta={[restaurant.area, restaurant.city].filter(Boolean).join(", ")}
        />

        <div className="mt-6">
          <RestaurantStatusCard
            restaurant={restaurant}
            missingDocuments={missingDocuments}
            onChanged={reloadRestaurant}
          />
        </div>

        {!isSuspended && (
          <>
            <Tabs
              label="Settings"
              value={tab}
              onChange={changeTab}
              fill
              className="mt-6"
              options={[
                { value: "details", label: "Details" },
                { value: "photos", label: "Photos" },
                {
                  value: "documents",
                  label: "Documents",
                  // How many are still missing: gold until all 4 are in
                  count: missingDocuments || undefined,
                  urgent: missingDocuments > 0,
                },
              ]}
            />

            <div className="mt-6">
              {tab === "details" && (
                <>
                  {savedMessage && (
                    <Alert tone="success" className="mb-4">
                      {savedMessage}
                    </Alert>
                  )}
                  {restaurant.status === "APPROVED" && (
                    <Text muted className="mb-4 text-[15px]">
                      Changing the registered business name sends the restaurant back to our team
                      for a check. Customers can't order until it's approved again.
                    </Text>
                  )}
                  <RestaurantForm
                    restaurant={restaurant}
                    submitLabel="Save changes"
                    onSave={handleSave}
                  />
                </>
              )}
              {tab === "photos" && (
                <RestaurantPhotos restaurant={restaurant} onUploaded={reloadRestaurant} />
              )}
              {tab === "documents" &&
                (documentsQuery.error ? (
                  <ErrorState
                    message={documentsQuery.error.message}
                    onRetry={documentsQuery.refetch}
                  />
                ) : documentsQuery.isPending ? (
                  <Skeleton className="h-80 w-full" />
                ) : (
                  <RestaurantDocuments
                    restaurantId={restaurant.id}
                    documents={documents}
                    onUploaded={reloadDocuments}
                  />
                ))}
            </div>
          </>
        )}
      </section>
    </Container>
  );
};

export default RestaurantSettingsPage;
