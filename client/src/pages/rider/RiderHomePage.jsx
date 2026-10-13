import { useState } from "react";
import SymbolBadge from "@/components/common/SymbolBadge";
import { isTopRatedRider } from "@/utils/topRated";
import { Link, useOutletContext } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BellRing,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  LocateOff,
  Package,
  Sun,
} from "lucide-react";
import Container from "@/layouts/Container";
import Text from "@/components/typography/Text";
import Card from "@/components/common/Card";
import Skeleton from "@/components/common/Skeleton";
import ErrorState from "@/components/common/ErrorState";
import OnlineSwitch from "@/components/rider/OnlineSwitch";
import {
  getCurrentDeliveryRequest,
  getCurrentOfferRequest,
  getEarningsRequest,
  getRiderStatusRequest,
  goOfflineRequest,
  goOnlineRequest,
} from "@/api/riderWork";
import { RIDER_DELIVERY_KEY, RIDER_OFFER_KEY, RIDER_STATUS_KEY } from "@/data/riderQueries";
import { getCurrentPoint } from "@/lib/geolocation";
import { turnOnAlertSound } from "@/lib/orderAlertSound";
import { useNow } from "@/hooks/useNow";
import { useAuthStore } from "@/store/authStore";
import PageHeader from "@/components/common/PageHeader";
import Alert from "@/components/common/Alert";
import { ListIcon } from "@/components/common/List";
import { formatMoney } from "@/utils/money";
import { todayInGhana } from "@/utils/date";

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
          <PageHeader title="Rider home" />
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
        <PageHeader
          title={<>Hello, {user.fullName.split(" ")[0]}</>}
          badge={
            status && isTopRatedRider(status) ? (
              <SymbolBadge
                symbol="dwennimmen"
                label="Top-rated rider"
                explain="Dwennimmen, the ram's horns, stands for humility and strength: 4.5 stars or more from customers"
              />
            ) : null
          }
          subtitle={
            status && isTopRatedRider(status)
              ? "Dwennimmen, the ram's horns, honours humility and strength: customers rate your deliveries " +
                status.averageRating +
                " stars."
              : null
          }
        />

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
          <Alert icon={LocateOff}>
            {" "}
            <Text className="text-[15px]">{switchError}</Text>
          </Alert>
        )}

        {isOnline && problem && (
          <Alert icon={LocateOff}>
            {" "}
            <Text className="text-[15px]">{LOCATION_PROBLEMS[problem]}</Text>
          </Alert>
        )}

        {isOnline && <LocationNote lastSentAt={lastSentAt} isScreenAwake={isScreenAwake} />}

        <TodayStrip />

        {delivery && <DeliveryInHand delivery={delivery} />}

        {isOnline && !delivery && !offerQuery.data && (
          <Card className="flex flex-col items-center gap-2 py-10 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <BellRing size={32} aria-hidden="true" />
            </span>
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

// Today at a glance: what this rider has earned and how many deliveries, with a link to
// the full earnings page. Hidden while loading or if it fails: the page works without it.
const TodayStrip = () => {
  const { data } = useQuery({
    queryKey: ["rider-earnings", { period: "day", date: todayInGhana(), page: 1 }],
    queryFn: () => getEarningsRequest({ period: "day", date: todayInGhana(), page: 1 }),
  });
  if (!data) {
    return null;
  }
  const count = data.summary.deliveryCount;

  return (
    <Card as={Link} to="/rider/earnings" interactive className="flex items-center gap-4">
      <div className="flex-1">
        <p className="text-[15px] text-muted-foreground">Today</p>
        <p className="font-heading text-2xl font-bold">
          {formatMoney(data.summary.earningsPesewas)}
        </p>
      </div>
      <p className="text-[15px] font-bold">
        {count} {count === 1 ? "delivery" : "deliveries"}
      </p>
      <ChevronRight size={20} className="text-muted-foreground" aria-hidden="true" />
    </Card>
  );
};

// Nothing accepted by the server for this long: something is wrong (signal, GPS, locked screen)
const QUIET_AFTER_SECONDS = 30;

// Calm while it works ("Sharing your location"); a warning only when it has gone quiet.
// Plus a reminder when the phone may lock its screen.
const LocationNote = ({ lastSentAt, isScreenAwake }) => {
  const now = useNow(1000);
  const secondsQuiet = lastSentAt ? Math.round((now - lastSentAt) / 1000) : null;

  return (
    <div className="flex flex-col gap-1 text-[15px]">
      {secondsQuiet === null && <p className="text-muted-foreground">Starting location sharing…</p>}
      {secondsQuiet !== null && secondsQuiet <= QUIET_AFTER_SECONDS && (
        <p className="flex items-center gap-2 font-bold text-success">
          <CircleCheck size={18} aria-hidden="true" />
          Sharing your location
        </p>
      )}
      {secondsQuiet !== null && secondsQuiet > QUIET_AFTER_SECONDS && (
        <p role="alert" className="flex items-center gap-2 font-bold text-destructive">
          <LocateOff size={18} aria-hidden="true" />
          Location not sent for {secondsQuiet} s. Check GPS and signal.
        </p>
      )}
      {!isScreenAwake && (
        <p className="flex items-center gap-2 text-muted-foreground">
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
  if (delivery.status === "RETURNING") {
    stepText = "Take the food back to the restaurant.";
  }

  return (
    <Card
      as={Link}
      to="/rider/delivery"
      tone="highlight"
      interactive
      className="flex items-center gap-3"
    >
      <ListIcon icon={Package} />
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
  );
};

export default RiderHomePage;
