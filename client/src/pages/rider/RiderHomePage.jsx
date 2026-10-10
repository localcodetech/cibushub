import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, CircleAlert, LocateOff, Package, Sun } from "lucide-react";
import Container from "@/layouts/Container";
import Heading from "@/components/typography/Heading";
import Text from "@/components/typography/Text";
import Card from "@/components/common/Card";
import Skeleton from "@/components/common/Skeleton";
import ErrorState from "@/components/common/ErrorState";
import OnlineSwitch from "@/components/rider/OnlineSwitch";
import OfferSheet from "@/components/rider/OfferSheet";
import {
  acceptOfferRequest,
  declineOfferRequest,
  getCurrentDeliveryRequest,
  getCurrentOfferRequest,
  getRiderStatusRequest,
  goOfflineRequest,
  goOnlineRequest,
} from "@/api/riderWork";
import { getCurrentPoint } from "@/lib/geolocation";
import { onLiveEvent } from "@/lib/liveUpdates";
import { playNewOrderSound, turnOnAlertSound } from "@/lib/orderAlertSound";
import { useLocationSharing } from "@/hooks/useLocationSharing";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useNow } from "@/hooks/useNow";
import { useAuthStore } from "@/store/authStore";

const STATUS_KEY = ["rider-status"];
const OFFER_KEY = ["rider-offer"];
const DELIVERY_KEY = ["rider-delivery"];

// The server says how many seconds are left; we turn that into a moment on THIS phone's
// clock, so a phone whose clock is wrong still counts down correctly
const withDeadline = (offer) => {
  if (!offer) {
    return null;
  }
  return { ...offer, deadline: Date.now() + offer.secondsLeft * 1000 };
};

const loadOffer = async () => withDeadline(await getCurrentOfferRequest());

// What to tell the rider when the phone won't give its location
const LOCATION_PROBLEMS = {
  DENIED:
    "Location is blocked for CibusHub. Allow it in your browser's site settings (the icon next to the address), then try again.",
  UNAVAILABLE: "We can't find your location. Turn on location (GPS) on your phone, then try again.",
  TIMEOUT: "Finding your location took too long. Move to an open space and try again.",
  UNSUPPORTED: "This browser can't share its location. Please use Chrome or Safari.",
};

// The rider's home [AC-RIDER-03, AC-RIDER-04, AC-ASSIGN-03]: go online, share the location,
// and answer delivery offers as they pop up.
const RiderHomePage = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const [isSwitching, setIsSwitching] = useState(false);
  const [switchError, setSwitchError] = useState("");
  const [isOfferHidden, setIsOfferHidden] = useState(false);
  const [isAnswering, setIsAnswering] = useState(false);
  const [offerError, setOfferError] = useState("");

  const statusQuery = useQuery({ queryKey: STATUS_KEY, queryFn: getRiderStatusRequest });
  const offerQuery = useQuery({ queryKey: OFFER_KEY, queryFn: loadOffer });
  const deliveryQuery = useQuery({ queryKey: DELIVERY_KEY, queryFn: getCurrentDeliveryRequest });

  const isOnline = statusQuery.data ? statusQuery.data.isOnline : false;
  const { lastSentAt, problem } = useLocationSharing(isOnline);
  const isScreenAwake = useWakeLock(isOnline);

  // Live events from the server for this rider
  useEffect(() => {
    const stopOffer = onLiveEvent("delivery:offer", (offer) => {
      setOfferError("");
      setIsOfferHidden(false);
      queryClient.setQueryData(OFFER_KEY, withDeadline(offer));
      playNewOrderSound();
    });
    // Given a delivery (by an admin) or taken off one: reload what's in hand
    const stopAssigned = onLiveEvent("delivery:assigned", () => {
      queryClient.invalidateQueries({ queryKey: DELIVERY_KEY });
    });
    const stopUnassigned = onLiveEvent("delivery:unassigned", () => {
      queryClient.invalidateQueries({ queryKey: DELIVERY_KEY });
    });
    // e.g. the server took us offline after 5 minutes without a location
    const stopStatus = onLiveEvent("rider:status", () => {
      queryClient.invalidateQueries({ queryKey: STATUS_KEY });
    });
    return () => {
      stopOffer();
      stopAssigned();
      stopUnassigned();
      stopStatus();
    };
  }, [queryClient]);

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
  const offer = offerQuery.data;
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
        queryClient.setQueryData(STATUS_KEY, await goOfflineRequest());
      } else {
        // This tap also lets the phone play the offer sound (browsers need a tap first)
        turnOnAlertSound();
        const point = await getCurrentPoint();
        queryClient.setQueryData(STATUS_KEY, await goOnlineRequest(point));
      }
    } catch (error) {
      setSwitchError(LOCATION_PROBLEMS[error.code] || error.message);
    }
    setIsSwitching(false);
  };

  const finishOffer = () => {
    queryClient.setQueryData(OFFER_KEY, null);
    setIsOfferHidden(false);
  };

  const handleAccept = async () => {
    setIsAnswering(true);
    try {
      await acceptOfferRequest(offer.offerId);
      finishOffer();
      queryClient.invalidateQueries({ queryKey: DELIVERY_KEY });
    } catch (error) {
      // e.g. "This delivery has already been taken": shown in the sheet, then they close it
      setOfferError(error.message);
    }
    setIsAnswering(false);
  };

  const handleDecline = async () => {
    setIsAnswering(true);
    try {
      await declineOfferRequest(offer.offerId);
    } catch {
      // Already closed on the server: nothing more to do
    }
    finishOffer();
    setIsAnswering(false);
  };

  const handleCloseOffer = () => {
    // After an error or once it ran out, closing ends it; otherwise it can be reopened
    if (offerError || Date.now() >= offer.deadline) {
      setOfferError("");
      finishOffer();
      return;
    }
    setIsOfferHidden(true);
  };

  return (
    <Container>
      <section className="flex flex-col gap-4 py-8">
        <div>
          <Heading level={1}>Hello, {user.fullName.split(" ")[0]}</Heading>
        </div>

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

        {offer && isOfferHidden && (
          <OfferWaitingBar offer={offer} onOpen={() => setIsOfferHidden(false)} />
        )}

        {delivery && <DeliveryInHand delivery={delivery} />}

        {isOnline && !delivery && !offer && (
          <Card className="flex flex-col items-center gap-2 py-10 text-center">
            <BellRing size={36} className="text-primary" aria-hidden="true" />
            <Text className="font-bold">Waiting for offers</Text>
            <Text muted className="text-[15px]">
              Keep this screen open. Offers ring and pop up here.
            </Text>
          </Card>
        )}
      </section>

      {offer && !isOfferHidden && (
        <OfferSheet
          offer={offer}
          onAccept={handleAccept}
          onDecline={handleDecline}
          onClose={handleCloseOffer}
          isWorking={isAnswering}
          errorMessage={offerError}
        />
      )}
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
      <p aria-live="off">{sharedText}</p>
      {!isScreenAwake && (
        <p className="flex items-center gap-2">
          <Sun size={16} aria-hidden="true" />
          Keep the screen on: your phone stops sharing location when it locks.
        </p>
      )}
    </div>
  );
};

// The offer is still open but its pop-up was closed: a bar to bring it back
const OfferWaitingBar = ({ offer, onOpen }) => {
  const now = useNow(1000);
  const secondsLeft = Math.max(0, Math.ceil((offer.deadline - now) / 1000));
  if (secondsLeft === 0) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-h-12 items-center justify-between rounded-lg bg-primary px-4 font-bold text-primary-foreground"
    >
      <span>Delivery offer waiting</span>
      <span>{secondsLeft} s · View</span>
    </button>
  );
};

// The delivery this rider is on (the full delivery screen comes with the next task)
const DeliveryInHand = ({ delivery }) => {
  const isPickedUp = delivery.status === "PICKED_UP";

  let stepText = "Head to the restaurant. The food is still being prepared.";
  if (delivery.foodReady) {
    stepText = "The food is ready. Collect it at the restaurant.";
  }
  if (isPickedUp) {
    stepText = "Take the food to the customer.";
  }

  return (
    <Card className="flex flex-col gap-2 border-primary">
      <Text className="flex items-center gap-2 font-bold">
        <Package size={20} className="text-primary" aria-hidden="true" />
        Your delivery · {delivery.orderNumber}
      </Text>
      <Text className="text-[15px]">
        {delivery.pickup.restaurantName}, {delivery.pickup.area} →{" "}
        {delivery.dropoff.area || "the customer"}
      </Text>
      <Text muted className="text-[15px]">
        {stepText}
      </Text>
    </Card>
  );
};

export default RiderHomePage;
