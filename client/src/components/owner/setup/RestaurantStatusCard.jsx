import { useState } from "react";
import { Button } from "@/components/ui/button";
import Card from "@/components/common/Card";
import Alert from "@/components/common/Alert";
import Text from "@/components/typography/Text";
import { cn } from "@/lib/utils";
import { resubmitRestaurantRequest, setAcceptingOrdersRequest } from "@/api/ownerRestaurants";

// The top of a restaurant's settings: where it stands, and the one thing to do about it.
//   Live:               open or closed for new orders, right now [AC-REST-05]
//   Waiting for review: what's still missing (documents) [AC-REST-01]
//   Rejected:           the admin's reason and "Send for review again" [AC-REST-03]
//   Suspended:          frozen; only support can lift it
// restaurant: the saved restaurant; missingDocuments: how many of the 4 are not uploaded yet
// onChanged(): the status changed on the server; the page loads the restaurant again
const RestaurantStatusCard = ({ restaurant, missingDocuments, onChanged }) => {
  const [isWorking, setIsWorking] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Both buttons on this card work the same way: send, then reload, or show the problem
  const send = async (request) => {
    setErrorMessage("");
    setIsWorking(true);
    try {
      await request();
      await onChanged();
    } catch (error) {
      setErrorMessage(error.message);
    }
    setIsWorking(false);
  };

  const errorLine = errorMessage && <Alert className="mt-3">{errorMessage}</Alert>;

  if (restaurant.status === "APPROVED") {
    const isOpen = restaurant.isAcceptingOrders;
    return (
      <Card tone={isOpen ? "highlight" : "default"} padding="lg">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Text className="text-lg font-bold">
              {isOpen ? "Taking orders" : "Closed for orders"}
            </Text>
            <Text muted className="text-[15px]">
              {isOpen
                ? "Customers can order during your opening hours. Close if the kitchen is too busy."
                : "Customers see you as closed until you switch this back on."}
            </Text>
          </div>
          {/* role="switch" + aria-checked: screen readers say "on" / "off" */}
          <button
            type="button"
            role="switch"
            aria-checked={isOpen}
            aria-label="Taking orders"
            disabled={isWorking}
            onClick={() => send(() => setAcceptingOrdersRequest(restaurant.id, !isOpen))}
            className={cn(
              "relative h-9 w-16 shrink-0 rounded-full transition-colors disabled:opacity-60",
              isOpen ? "bg-success" : "bg-muted-foreground/40",
            )}
          >
            <span
              className={cn(
                "absolute top-1 left-1 size-7 rounded-full bg-white shadow transition-transform",
                isOpen && "translate-x-7",
              )}
            />
          </button>
        </div>
        {errorLine}
      </Card>
    );
  }

  if (restaurant.status === "REJECTED") {
    return (
      <Card tone="danger" padding="lg">
        <Text className="text-lg font-bold">Our team couldn't approve this yet</Text>
        {restaurant.rejectionReason && (
          <Text className="mt-1">Reason: {restaurant.rejectionReason}</Text>
        )}
        <Text muted className="mt-2 text-[15px]">
          Fix what's asked below (details, photos or documents), then send it back.
        </Text>
        <Button
          type="button"
          disabled={isWorking}
          onClick={() => send(() => resubmitRestaurantRequest(restaurant.id))}
          className="mt-4 h-12 w-full font-bold sm:w-auto sm:px-8"
        >
          {isWorking ? "Sending…" : "Send for review again"}
        </Button>
        {errorLine}
      </Card>
    );
  }

  if (restaurant.status === "SUSPENDED") {
    return (
      <Card tone="danger" padding="lg">
        <Text className="text-lg font-bold">This restaurant is suspended</Text>
        <Text muted className="mt-1 text-[15px]">
          Customers can't see it and its details can't be changed. Please contact support.
        </Text>
      </Card>
    );
  }

  // Waiting for review
  return (
    <Card tone="quiet" padding="lg">
      <Text className="text-lg font-bold">Waiting for our team's review</Text>
      <Text muted className="mt-1 text-[15px]">
        {missingDocuments > 0
          ? `Upload the ${missingDocuments} missing document${missingDocuments === 1 ? "" : "s"} under Documents, so we can check your restaurant.`
          : "Everything is in. We usually reply within 1 to 2 working days, by text."}
      </Text>
    </Card>
  );
};

export default RestaurantStatusCard;
