import { useState } from "react";
import { Link, useOutletContext } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, ChevronRight, CircleAlert, LocateOff, Package, Sun } from "lucide-react";
import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import Card from "@/components/common/Card";
import Skeleton from "@/components/common/Skeleton";
import ErrorState from "@/components/common/ErrorState";
import OnlineSwitch from "@/components/rider/OnlineSwitch";
import {
  getCurrentDeliveryRequest,
  getCurrentOfferRequest,
  getRiderStatusRequest,
  goOfflineRequest,
  goOnlineRequest,
} from "@/api/riderWork";
import { RIDER_DELIVERY_KEY, RIDER_OFFER_KEY, RIDER_STATUS_KEY } from "@/data/riderQueries";
import { getCurrentPoint } from "@/lib/geolocation";
import { turnOnAlertSound } from "@/lib/orderAlertSound";
import { useNow } from "@/hooks/useNow";
import { useAuthStore } from "@/store/authStore";

// What to tell the rider when the phone won't give its location
const LOCATION_PROBLEMS = {
  DENIED:
    "Location is blocked for CibusHub. Allow it in your browser's site settings (the icon next to the address), then try again.",
  UNAVAILABLE: "We can't find your location. Turn on location (GPS) on your phone, then try again.",
  TIMEOUT: "Finding your location took too long. Move to an open space and try again.",
  UNSUPPORTED: "This browser can't share its location. Please use Chrome or Safari.",
};

// The rider's home [AC-RIDER-03, AC-RIDER-04]: go online or offline, see that the location
// is being shared, and the delivery in hand. (Offers pop up from the RiderLayout.)
const RiderHomePage = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  // From RiderLayout: the location sharing that keeps running on every rider page
  const { lastSentAt, problem, isScreenAwake } = useOutletContext();

  const [isSwitching, setIsSwitching] = useState(false);
  const [switchError, setSwitchError] = useState("");

  const statusQuery = useQuery({ queryKey: RIDER_STATUS_KEY, queryFn: getRiderStatusRequest });
  const deliveryQuery = useQuery({
    queryKey: RIDER_DELIVERY_KEY,
    queryFn: getCurrentDeliveryRequest,
  });
  // Only READS the offer the layout loads (enabled: false = this page never fetches it)
  const offerQuery = useQuery({
    queryKey: RIDER_OFFER_KEY,
    queryFn: getCurrentOfferRequest,
    enabled: false,
  });

  if (statusQuery.isPending) {
    return (
      <Container>
        <div role="status" className="flex flex-col gap-4 py-8">
          <span className="sr-only">Loading</span>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-24 w-full" />
        </div>
      </Container>
    );
  }

  if (statusQuery.isError) {
    return (
      <Container>
        <div className="py-8">
          <ErrorState message={statusQuery.error.message} onRetry={statusQuery.refetch} />
        </div>
      </Container>
    );
  }

  const status = statusQuery.data;
  const isOnline = status.isOnline;
  const delivery = deliveryQuery.data;

  // Not approved (e.g. suspended): no switch, just where to go
  if (status.applicationStatus !== "APPROVED") {
    return (
      <Container>
        <section className="flex flex-col gap-4 py-8">
          <Heading level={1}>Rider home</Heading>
          <Card className="flex gap-3">
            <CircleAlert size={24} className="shrink-0 text-destructive" aria-hidden="true" />
            <div>
              <Text className="font-bold">You can't go online yet</Text>
              <Link to="/rider/apply" className="font-bold text-primary underline">
                See your rider application
              </Link>
            </div>
          </Card>
        </section>
      </Container>
    );
  }

  const handleToggle = async () => {
    setSwitchError("");
    setIsSwitching(true);
    try {
      if (isOnline) {
        queryClient.setQueryData(RIDER_STATUS_KEY, await goOfflineRequest());
      } else {
        // This tap also lets the phone play the offer sound (browsers need a tap first)
        turnOnAlertSound();
        const point = await getCurrentPoint();
        queryClient.setQueryData(RIDER_STATUS_KEY, await goOnlineRequest(point));
      }
    } catch (error) {
      setSwitchError(LOCATION_PROBLEMS[error.code] || error.message);
    }
    setIsSwitching(false);
  };

  return (
    <Container>
      <section className="flex flex-col gap-4 py-8">
        <Heading level={1}>Hello, {user.fullName.split(" ")[0]}</Heading>

        <OnlineSwitch
          isOnline={isOnline}
          // Going offline with food in hand would stop the customer's tracking
          isWorking={isSwitching || (isOnline && Boolean(delivery))}
          onToggle={handleToggle}
        />
        {isOnline && delivery && (
          <Text muted className="text-[15px]">
            Finish your delivery before going offline.
          </Text>
        )}

        {switchError && (
          <div role="alert" className="flex gap-3 rounded-lg border border-destructive p-4">
            <LocateOff size={24} className="shrink-0 text-destructive" aria-hidden="true" />
            <Text className="text-[15px]">{switchError}</Text>
          </div>
        )}

        {isOnline && problem && (
          <div role="alert" className="flex gap-3 rounded-lg border border-destructive p-4">
            <LocateOff size={24} className="shrink-0 text-destructive" aria-hidden="true" />
            <Text className="text-[15px]">{LOCATION_PROBLEMS[problem]}</Text>
          </div>
        )}

        {isOnline && <LocationNote lastSentAt={lastSentAt} isScreenAwake={isScreenAwake} />}

        {delivery && <DeliveryInHand delivery={delivery} />}

        {isOnline && !delivery && !offerQuery.data && (
          <Card className="flex flex-col items-center gap-2 py-10 text-center">
            <BellRing size={36} className="text-primary" aria-hidden="true" />
            <Text className="font-bold">Waiting for offers</Text>
            <Text muted className="text-[15px]">
              Keep this screen open. Offers ring and pop up here.
            </Text>
          </Card>
        )}
      </section>
    </Container>
  );
};

// "Location shared 3 s ago", and a reminder when the phone may lock its screen
const LocationNote = ({ lastSentAt, isScreenAwake }) => {
  const now = useNow(1000);

  let sharedText = "Sharing your location…";
  if (lastSentAt) {
    sharedText = "Location shared " + Math.round((now - lastSentAt) / 1000) + " s ago";
  }

  return (
    <div className="flex flex-col gap-1 text-[15px] text-muted-foreground">
      <p>{sharedText}</p>
      {!isScreenAwake && (
        <p className="flex items-center gap-2">
          <Sun size={16} aria-hidden="true" />
          Keep the screen on: your phone stops sharing location when it locks.
        </p>
      )}
    </div>
  );
};

// The delivery this rider is on, with a big link to its screen
const DeliveryInHand = ({ delivery }) => {
  let stepText = "Head to the restaurant. The food is still being prepared.";
  if (delivery.foodReady) {
    stepText = "The food is ready. Collect it at the restaurant.";
  }
  if (delivery.status === "PICKED_UP") {
    stepText = "Take the food to the customer.";
  }

  return (
    <Link to="/rider/delivery" className="block">
      <Card className="flex items-center gap-3 border-primary">
        <Package size={24} className="shrink-0 text-primary" aria-hidden="true" />
        <div className="flex-1">
          <Text className="font-bold">Your delivery · {delivery.orderNumber}</Text>
          <Text className="text-[15px]">
            {delivery.pickup.restaurantName} → {delivery.dropoff.area || "the customer"}
          </Text>
          <Text muted className="text-[15px]">
            {stepText}
          </Text>
        </div>
        <ChevronRight size={24} className="shrink-0" aria-hidden="true" />
      </Card>
    </Link>
  );
};

export default RiderHomePage;
